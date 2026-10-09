import { describe, expect, it } from "vitest";
import { defaultProviders, discoverPaymentRoutes, defaultPaymentRoutes, filterProviders, type PaymentProvider } from "../src/index.js";

const provider = defaultProviders.find((item) => item.id === "satora")!;
const route = defaultPaymentRoutes.find((item) => item.id === "satora-137-usdt0")!;
const options = { query: "USDT Polygon", amountMsat: 3000000n, invoiceNetwork: "bitcoin" as const, now: Date.parse("2026-10-09T00:00:00Z") / 1000 };

describe("independent-review regressions", () => {
  it("blocks a known maximum even without a known minimum", () => {
    const maximumOnly = { ...route, limits: { maximumSats: "1000", checkedAt: "2026-10-08", sourceUrl: "https://example.com/limits" } };
    expect(discoverPaymentRoutes([provider], [maximumOnly], options)[0]?.eligibility).toBe("above_maximum");
    expect(discoverPaymentRoutes([provider], [maximumOnly], { ...options, amountMsat: 500000n })[0]?.eligibility).toBe("limits_unknown");
    expect(discoverPaymentRoutes([provider], [maximumOnly], { ...options, now: Date.parse("2026-12-09T00:00:00Z") / 1000 })[0]?.eligibility).toBe("limits_unknown");
  });
  it("rejects control-bearing handoff and evidence URLs before URL normalization", () => {
    expect(discoverPaymentRoutes([{ ...provider, action: { ...provider.action, url: "https://sa\r\ntora.io/" } }], [route], options)).toEqual([]);
    expect(filterProviders([{ ...provider, evidence: [{ ...provider.evidence[0]!, url: "https://satora.io/\u0000" }] }], {})).toEqual([]);
  });
  it("rejects malformed or oversized provider collections and evidence", () => {
    for (const input of [null, undefined, {}, Array.from({ length: 1001 }, () => provider)]) {
      expect(filterProviders(input as readonly PaymentProvider[], {})).toEqual([]);
      expect(discoverPaymentRoutes(input as readonly PaymentProvider[], [route], options)).toEqual([]);
    }
    expect(filterProviders([{ ...provider, evidence: Array.from({ length: 33 }, () => provider.evidence[0]!) }], {})).toEqual([]);
  });
});
