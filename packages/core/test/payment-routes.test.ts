import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import * as publicApi from "../src/index.js";
import * as routeApi from "../src/payment-routes.js";
import type { PaymentProvider } from "../src/providers.js";

const provider: PaymentProvider = {
  id: "example-swap", name: "Example Swap", aliases: [], category: "swap", custody: "swap_based", platforms: ["web"],
  regions: { scope: "global" }, action: { type: "copy_then_open", url: "https://swap.example/", label: "Open Example Swap" },
  serviceStatus: "active", verificationStatus: "verified", lastVerifiedAt: "2026-10-01",
  evidence: [{ url: "https://swap.example/docs", claim: "Pays invoices", checkedAt: "2026-10-01" }], accountRequired: false, kycRequired: false
};
const now = Date.parse("2026-10-09T00:00:00Z") / 1000;
const options = { query: "USDT Tron", amountMsat: 1000n, invoiceNetwork: "bitcoin" as const, now };

const route = {
  id: "example-usdt-tron", providerId: "example-swap", assetSymbol: "USDT", assetName: "Tether",
  network: "Tron", aliases: ["tether usd"],
  evidence: [{ url: "https://swap.example/docs", claim: "USDT on Tron to Lightning", checkedAt: "2026-10-01" }] as const,
  lastVerifiedAt: "2026-10-01",
  limits: { minimumSats: "1", maximumSats: "9007199254740993", checkedAt: "2026-10-01", sourceUrl: "https://swap.example/limits" }
};

describe("public route database", () => {
  it("exposes validated static routes and public framework-neutral functions", () => {
    const database = routeApi.parsePaymentRouteDatabase(JSON.parse(readFileSync(new URL("../src/data/payment-routes.json", import.meta.url), "utf8")));
    expect(publicApi.defaultPaymentRoutes).toEqual(database.routes);
    expect(publicApi.paymentRouteDatabaseInfo).toEqual({ schemaVersion: 1, updatedAt: database.updatedAt });
    expect(publicApi.discoverPaymentRoutes).toBe(routeApi.discoverPaymentRoutes);
    expect(publicApi.isAssetQuery).toBe(routeApi.isAssetQuery);
    expect(publicApi.resolveAssetQuery).toBe(routeApi.resolveAssetQuery);
    expect(publicApi.parsePaymentRoute).toBe(routeApi.parsePaymentRoute);
    expect(publicApi.parsePaymentRouteDatabase).toBe(routeApi.parsePaymentRouteDatabase);
    const schema = JSON.parse(readFileSync(new URL("../src/data/payment-routes.schema.json", import.meta.url), "utf8"));
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.routes.items.$ref).toBe("#/$defs/route");
  });
});

describe("route discovery", () => {
  it("fails closed for non-array or oversized host route collections", () => {
    for (const invalid of [null, undefined, {}, "USDT", Array.from({ length: 10001 }, () => route)]) {
      expect(routeApi.isAssetQuery("USDT", invalid as readonly routeApi.PaymentRoute[])).toBe(false);
      expect(routeApi.discoverPaymentRoutes([provider], invalid as readonly routeApi.PaymentRoute[], options)).toEqual([]);
    }
  });
  it("hides suspended/unverified/invalid providers, orphan routes and category mismatches", () => {
    for (const item of [
      { ...provider, serviceStatus: "suspended" as const }, { ...provider, verificationStatus: "unverified" as const },
      { ...provider, action: { ...provider.action, url: "javascript:alert(1)" } }, { ...provider, id: "other-provider" }
    ]) expect(routeApi.discoverPaymentRoutes([item], [route], options)).toEqual([]);
    expect(routeApi.discoverPaymentRoutes([provider], [route], { ...options, category: "wallet" })).toEqual([]);
    expect(routeApi.discoverPaymentRoutes([{ ...provider, serviceStatus: "maintenance" }], [route], options)).toHaveLength(1);
  });
  it("orders fits first, then unknown, then blocked; uses organic provider/network alphabetical ties", () => {
    const alpha = { ...provider, id: "alpha", name: "Alpha" };
    const zulu = { ...provider, id: "zulu", name: "Zulu" };
    const items = [
      { ...route, id: "blocked", providerId: "alpha", limits: { ...route.limits, minimumSats: "2" } },
      { ...route, id: "unknown", providerId: "alpha", limits: { ...route.limits, checkedAt: "2026-01-01" } },
      { ...route, id: "fit-zulu", providerId: "zulu" },
      { ...route, id: "fit-tron", providerId: "alpha" },
      { ...route, id: "fit-ethereum", providerId: "alpha", network: "Ethereum" }
    ];
    const sorted = routeApi.discoverPaymentRoutes([zulu, alpha], items, { ...options, query: "USDT" });
    expect(sorted.map(({ route: { id } }) => id)).toEqual(["fit-ethereum", "fit-tron", "fit-zulu", "unknown", "blocked"]);
    expect(routeApi.discoverPaymentRoutes([alpha, zulu], [...items].reverse(), { ...options, query: "USDT" })).toEqual(sorted);
  });
  it("discards invalid and ambiguous duplicate routes without crashing on invalid decimal strings", () => {
    const invalid = { ...route, limits: { ...route.limits, minimumSats: "not a number" } };
    expect(routeApi.discoverPaymentRoutes([provider], [invalid, { ...route, id: "valid" }], options).map(({ route: { id } }) => id)).toEqual(["valid"]);
    expect(routeApi.discoverPaymentRoutes([provider], [route, route], options)).toEqual([]);
    expect(routeApi.isAssetQuery("USDT", [invalid])).toBe(false);
  });
  it("never trusts future-dated provider verification", () => {
    expect(routeApi.discoverPaymentRoutes([{ ...provider, lastVerifiedAt: "2026-10-10" }], [route], options)).toEqual([]);
  });
  it.each([
    ["2026-09-09", "within_limits"], ["2026-09-08", "limits_unknown"], ["2026-10-10", "limits_unknown"]
  ] as const)("trusts limits for at most 30 days and never future dates %s", (checkedAt, expected) => {
    expect(routeApi.discoverPaymentRoutes([provider], [{ ...route, limits: { ...route.limits, checkedAt } }], options)[0]?.eligibility).toBe(expected);
  });
  it("expires limits one second beyond the freshness boundary", () => {
    const older = { ...route, limits: { ...route.limits, checkedAt: "2026-09-09" } };
    expect(routeApi.discoverPaymentRoutes([provider], [older], { ...options, now: now + 1 })[0]?.eligibility).toBe("limits_unknown");
  });
  it("keeps routes with absent limits or absent minimum visible but unknown", () => {
    const noLimits = { ...route };
    Reflect.deleteProperty(noLimits, "limits");
    for (const item of [noLimits, { ...route, limits: { checkedAt: "2026-10-01", sourceUrl: "https://swap.example/limits", maximumSats: "100" } }]) {
      expect(routeApi.discoverPaymentRoutes([provider], [item], options)[0]?.eligibility).toBe("limits_unknown");
    }
  });
  it("does not trust future route verification or evidence", () => {
    for (const item of [{ ...route, lastVerifiedAt: "2026-10-10" }, { ...route, evidence: [{ ...route.evidence[0], checkedAt: "2026-10-10" }] }]) {
      expect(routeApi.discoverPaymentRoutes([provider], [item], options)).toEqual([]);
    }
  });
  it.each([NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])("fails closed for invalid epoch-second now %s", (now) => {
    expect(routeApi.discoverPaymentRoutes([provider], [route], { ...options, now })).toEqual([]);
  });
  it.each([
    [1n, "fractional_satoshi"], [999n, "fractional_satoshi"], [1001n, "fractional_satoshi"],
    [1000n, "below_minimum"], [2000n, "within_limits"], [3000n, "within_limits"], [4000n, "above_maximum"]
  ] as const)("checks whole-satoshi boundaries without rounding %s", (amountMsat, expected) => {
    const limited = { ...route, limits: { ...route.limits, minimumSats: "2", maximumSats: "3" } };
    expect(routeApi.discoverPaymentRoutes([provider], [limited], { ...options, amountMsat })[0]?.eligibility).toBe(expected);
  });
  it("honors exclusive minima and truthfully describes a known minimum without maximum", () => {
    const exclusive = { ...route, limits: { minimumSats: "1", minimumExclusive: true, checkedAt: "2026-10-01", sourceUrl: "https://swap.example/limits" } };
    expect(routeApi.discoverPaymentRoutes([provider], [exclusive], options)[0]?.eligibility).toBe("below_minimum");
    const result = routeApi.discoverPaymentRoutes([provider], [exclusive], { ...options, amountMsat: 2000n })[0];
    expect(result?.eligibility).toBe("within_limits");
    expect(result?.reason).toMatch(/meets.*minimum.*maximum.*unknown.*final quote/i);
  });
  it.each(["testnet", "signet", "regtest", "unknown"])("does not offer mainnet routes for %s invoices", (invoiceNetwork) => {
    expect(routeApi.discoverPaymentRoutes([provider], [route], { ...options, invoiceNetwork: invoiceNetwork as "testnet" })[0]?.eligibility).toBe("unsupported_network");
  });
  it.each([null, -1n, 0n, NaN, Infinity, 1.5, 1000, "1000"])("fails closed for invalid/unknown invoice amount %s", (amountMsat) => {
    expect(routeApi.discoverPaymentRoutes([provider], [route], { ...options, amountMsat: amountMsat as bigint | null })[0]?.eligibility).toBe("amount_unknown");
  });
  it("joins a visible provider and compares published sats exactly with bigint invoice msat", () => {
    const discover = (amountMsat: bigint) => routeApi.discoverPaymentRoutes([provider], [route], { ...options, amountMsat });
    expect(discover(1000n)[0]).toMatchObject({ route, provider, eligibility: "within_limits" });
    expect(discover(9007199254740993000n)[0]?.eligibility).toBe("within_limits");
    expect(discover(9007199254740994000n)[0]?.eligibility).toBe("above_maximum");
    expect(discover(0n)[0]?.eligibility).toBe("amount_unknown");
  });
});

describe("asset query recognition", () => {
  const ethereum = { ...route, id: "example-usdt-ethereum", network: "Ethereum" };
  it("matches exact asset terms and explicit networks without crossing networks", () => {
    for (const query of ["USDT Tron", "tether ethereum", "  UsDt   TRON  ", "USDT on Tron", "Tron USDT"]) {
      expect(routeApi.resolveAssetQuery(query, [route, ethereum]).map(({ network }) => network)).toEqual([query.toLowerCase().includes("ethereum") ? "Ethereum" : "Tron"]);
    }
    expect(routeApi.resolveAssetQuery("USDT", [route, ethereum])).toHaveLength(2);
    expect(routeApi.isAssetQuery("tether usd", [route])).toBe(true);
    expect(routeApi.isAssetQuery("Spark", [{ ...route, aliases: ["Spark"] }])).toBe(true);
  });
  it.each(["t", "usd", "USDT Polygon", "Turkey", "TR", "example swap", "Tron", "", "x".repeat(241)])("does not hijack partial/provider/country query %s", (query) => {
    expect(routeApi.isAssetQuery(query, [route, ethereum, { ...route, id: "tr-alias", aliases: ["TR"] }])).toBe(false);
  });
});

describe("route validation", () => {
  it.each([
    { ...route, unexpected: true },
    { ...route, id: "../unsafe" },
    { ...route, assetName: "x".repeat(81) },
    { ...route, aliases: ["x".repeat(81)] },
    { ...route, aliases: Array.from({ length: 25 }, () => "tether") },
    { ...route, notes: "x".repeat(601) },
    { ...route, network: "\u0000Tron" },
    { ...route, evidence: [] },
    { ...route, lastVerifiedAt: "2026-02-30" },
    { ...route, lastVerifiedAt: "2026-1-01" },
    ...["http://swap.example/", "https://user:pass@swap.example/", "javascript:alert(1)", " https://swap.example/", "https://swap.example/\n"].map((url) => ({ ...route, evidence: [{ ...route.evidence[0], url }] })),
    ...["0", "-1", "1.5", "01", "1e3", "9".repeat(31)].map((minimumSats) => ({ ...route, limits: { ...route.limits, minimumSats } })),
    { ...route, limits: { ...route.limits, minimumSats: "2", maximumSats: "1" } },
    { ...route, limits: { ...route.limits, minimumSats: 1 } },
    { ...route, limits: { ...route.limits, sourceUrl: "https://user@swap.example/" } },
    { ...route, limits: { ...route.limits, checkedAt: "2026-02-30" } },
    { ...route, limits: { ...route.limits, extra: true } },
    { ...route, evidence: [{ ...route.evidence[0], extra: true }] }
  ])("rejects unsafe route metadata %#", (input) => {
    expect(() => routeApi.parsePaymentRoute(input)).toThrow();
  });
  it("rejects duplicate route IDs and unknown database fields", () => {
    expect(() => routeApi.parsePaymentRouteDatabase({ schemaVersion: 1, updatedAt: "2026-10-09", routes: [route, route] })).toThrow();
    expect(() => routeApi.parsePaymentRouteDatabase({ schemaVersion: 1, updatedAt: "2026-10-09", routes: [], extra: true })).toThrow();
    expect(() => routeApi.parsePaymentRouteDatabase({ schemaVersion: 1, updatedAt: "2026-02-30", routes: [] })).toThrow();
  });
  it("parses a strict route and canonical empty database without numeric coercion", () => {
    expect(routeApi.parsePaymentRoute(route)).toEqual(route);
    expect(routeApi.parsePaymentRouteDatabase({ schemaVersion: 1, updatedAt: "2026-10-09", routes: [] }).routes).toEqual([]);
  });
});
