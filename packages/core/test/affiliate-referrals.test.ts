import { describe, expect, it } from "vitest";
import { applyAffiliateOverrides, createPaymentRouteHandoff, defaultPaymentRoutes, defaultProviders, discoverPaymentRoutes } from "../src/index.js";
import { fakeInvoice } from "./fixtures.js";

const providers = defaultProviders.filter(({ id }) => ["fixedfloat", "bitcoinvn", "satora"].includes(id));

describe("shared host referral configuration", () => {
  it("bundles a disclosed BitcoinVN referral without losing Lightning settlement", () => {
    const view = applyAffiliateOverrides(providers).find(({ id }) => id === "bitcoinvn")!;
    const url = new URL(view.destinationUrl);
    expect(url.searchParams.get("ref")).toBe("efd36219af705e28");
    expect(url.searchParams.get("settle")).toBe("btcln");
    expect(view.affiliateDisclosure).toBe("Affiliate");
  });

  it("replaces all bundled codes with one map and disables them individually", () => {
    const overrides = { fixedfloat: "host-ff", bitcoinvn: "host-bvn" };
    const views = applyAffiliateOverrides(providers, overrides);
    for (const id of ["fixedfloat", "bitcoinvn"] as const) {
      expect(new URL(views.find(p => p.id === id)!.destinationUrl).searchParams.getAll("ref")).toEqual([overrides[id]]);
      expect(views.find(p => p.id === id)!.affiliateDisclosure).toBe("Affiliate");
      const disabled = applyAffiliateOverrides(providers, { [id]: null }).find(p => p.id === id)!;
      expect(new URL(disabled.destinationUrl).searchParams.has("ref")).toBe(false);
      expect(disabled.affiliateDisclosure).toBeUndefined();
    }
    expect(views.map(p => p.id)).toEqual(providers.map(p => p.id));
    expect(views.find(p => p.id === "satora")!.destinationUrl).toBe(providers.find(p => p.id === "satora")!.action.url);
    expect(overrides).toEqual({ fixedfloat: "host-ff", bitcoinvn: "host-bvn" });
  });

  it("uses the same defaults, replacements and opt-outs for token-route handoffs", () => {
    const now = Date.parse("2026-10-09T00:00:00Z") / 1000;
    const invoice = fakeInvoice({ createdAt: now, amountHrp: "10000n" });
    for (const id of ["fixedfloat", "bitcoinvn"] as const) {
      const provider = providers.find(p => p.id === id)!;
      const route = defaultPaymentRoutes.find(r => r.providerId === id)!;
      const view = discoverPaymentRoutes([provider], [route], { query: route.assetSymbol, invoiceNetwork: "bitcoin", amountMsat: 1000000n, now })[0]!;
      const defaults = createPaymentRouteHandoff(view, invoice, { now });
      expect(new URL(defaults.url).searchParams.get("ref")).toBe(id === "fixedfloat" ? "pmdxabka" : "efd36219af705e28");
      expect(defaults.invoicePrefilled).toBe(id === "fixedfloat");
      const affiliateOverrides = { [id]: "host-only" };
      expect(new URL(createPaymentRouteHandoff(view, invoice, { now, affiliateOverrides }).url).searchParams.getAll("ref")).toEqual(["host-only"]);
      expect(new URL(createPaymentRouteHandoff(view, invoice, { now, affiliateOverrides: { [id]: null } }).url).searchParams.has("ref")).toBe(false);
      expect(new URL(createPaymentRouteHandoff(view, "invalid", { now, affiliateOverrides }).url).searchParams.getAll("ref")).toEqual(["host-only"]);
    }
  });

  it("never merges affiliate invoice/payment parameters into a verified handoff", () => {
    const now = Date.parse("2026-10-09T00:00:00Z") / 1000;
    const invoice = fakeInvoice({ createdAt: now, amountHrp: "10000n" });
    const provider = providers.find(p => p.id === "fixedfloat")!;
    const route = defaultPaymentRoutes.find(r => r.id === "fixedfloat-usdttrc")!;
    const view = discoverPaymentRoutes([provider], [route], { query: "USDT", invoiceNetwork: "bitcoin", amountMsat: 1000000n, now })[0]!;
    const affiliateOverrides = { fixedfloat: { url: "https://ff.io/?ref=host&ref=shadow&address=evil&toAmount=999&fromAmount=999&from=BTC&type=float", disclosure: "Host affiliate" } };
    const result = createPaymentRouteHandoff(view, invoice, { now, affiliateOverrides });
    const url = new URL(result.url);
    expect(result.invoicePrefilled).toBe(true);
    expect(url.searchParams.getAll("ref")).toEqual(["host"]);
    expect(url.searchParams.get("address")).toBe(invoice);
    expect(url.searchParams.get("toAmount")).toBe("0.00001");
    expect(url.searchParams.get("from")).toBe("USDTTRC");
    expect(url.searchParams.get("type")).toBe("fixed");
    expect(url.searchParams.has("fromAmount")).toBe(false);
    const custom = { fixedfloat: { url: "https://host.example/redirect?ref=custom", disclosure: "Host affiliate" } };
    expect(createPaymentRouteHandoff(view, invoice, { now, affiliateOverrides: custom })).toEqual({ url: custom.fixedfloat.url, invoicePrefilled: false });
  });

  it("encodes opaque codes, rejects empty codes and never invents syntax for other providers", () => {
    const code = "host&address=evil";
    const url = new URL(applyAffiliateOverrides(providers, { bitcoinvn: code }).find(p => p.id === "bitcoinvn")!.destinationUrl);
    expect(url.searchParams.get("ref")).toBe(code);
    expect(url.searchParams.has("address")).toBe(false);
    expect(() => applyAffiliateOverrides(providers, { bitcoinvn: "" })).toThrow();
    expect(() => applyAffiliateOverrides(providers, { satora: "unknown-contract" })).toThrow();
  });
});
