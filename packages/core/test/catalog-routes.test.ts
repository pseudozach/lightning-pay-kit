import { describe, expect, it } from "vitest";
import routeData from "../src/data/payment-routes.json";
import { defaultProviders, filterProviders } from "../src/providers.js";
import { discoverPaymentRoutes, parsePaymentRouteDatabase, resolveAssetQuery } from "../src/payment-routes.js";

const now = Date.parse("2026-10-08T23:00:00Z") / 1000;
const database = () => parsePaymentRouteDatabase(routeData);
const discover = (query: string, sats = 1000n) => discoverPaymentRoutes(defaultProviders, database().routes, {
  query, amountMsat: sats * 1000n, invoiceNetwork: "bitcoin", now
});

describe("evidence-backed canonical token routes", () => {
  it("discovers exact network-specific USDT variants with directional Satora invoice limits", () => {
    const polygon = discover("USDT Polygon").find(({ route }) => route.providerId === "satora");
    const ethereum = discover("USDT Ethereum").find(({ route }) => route.providerId === "satora");
    expect(polygon).toBeDefined();
    expect(polygon?.route.assetSymbol).toBe("USDT0");
    expect(polygon?.route.limits).toMatchObject({ minimumSats: "356", maximumSats: "2000000" });
    expect(polygon?.eligibility).toBe("within_limits");
    expect(ethereum?.route.limits?.minimumSats).toBe("10000");
    expect(ethereum?.eligibility).toBe("below_minimum");
    expect(discover("USDT Polygon", 355n).find(({ route }) => route.providerId === "satora")?.eligibility).toBe("below_minimum");
  });
  it("uses BitcoinVN's quote-specific floor only on the tested Polygon method and preserves USDT0", () => {
    const polygon = discover("USDT Polygon").find(({ route }) => route.id === "bitcoinvn-usdtpolygon");
    expect(polygon?.route.limits?.minimumSats).toBe("6115");
    expect(polygon?.eligibility).toBe("below_minimum");
    expect(discover("USDT Tron").find(({ route }) => route.providerId === "bitcoinvn")?.eligibility).toBe("limits_unknown");
    expect(discover("USDT0 Ink").find(({ route }) => route.id === "bitcoinvn-usdt0ink")?.route.assetSymbol).toBe("USDT0");
  });
  it("uses readable source-network names for actual FixedFloat pairs without inventing payout limits", () => {
    const avalanche = discover("USDT Avalanche C-Chain").find(({ route }) => route.providerId === "fixedfloat");
    expect(avalanche).toBeDefined();
    expect(avalanche?.eligibility).toBe("limits_unknown");
    expect(avalanche?.route.limits).toBeUndefined();
    const fixed = database().routes.filter(({ providerId }) => providerId === "fixedfloat");
    expect(fixed).toHaveLength(65);
    expect(fixed.every(({ limits, notes }) => !limits && notes?.includes("NOT invoice sats limits"))).toBe(true);
    expect(fixed.some(({ id }) => id === "fixedfloat-usdtton" || id === "fixedfloat-usdtop")).toBe(false);
  });
  it("has valid unique canonical identities, references and dated evidence without research-only fields", () => {
    const { routes } = database();
    expect(routes).toHaveLength(285);
    expect(new Set(routes.map(({ id }) => id)).size).toBe(routes.length);
    for (const route of routes) {
      expect(defaultProviders.some(({ id }) => id === route.providerId), route.id).toBe(true);
      expect(route.lastVerifiedAt).toBe("2026-10-08");
      expect(route.evidence.length).toBeGreaterThan(0);
      expect(Object.keys(route)).not.toContain("source");
      expect(Object.keys(route)).not.toContain("routeStatus");
      expect(route.aliases.some((alias) => /^\d+$/.test(alias)), route.id).toBe(false);
    }
  });
  it("retains catalog-only BitcoinVN candidates without claiming a Cartesian product proves payment", () => {
    const candidates = database().routes.filter(({ providerId }) => providerId === "bitcoinvn");
    expect(candidates).toHaveLength(200);
    for (const route of candidates) {
      expect(["VND", "USD", "EUR", "sUSD", "sEUR", "sVND"]).not.toContain(route.assetSymbol);
      if (route.id !== "bitcoinvn-usdtpolygon") {
        expect(route.limits).toBeUndefined();
        expect(route.notes).toContain("Catalog-only candidate");
        expect(route.notes).toContain("do NOT establish a quoted directional pair");
      }
    }
  });
  it("keeps hidden/unverified providers out of discovery and avoids ambiguous chain-number aliases", () => {
    const hidden = ["boltz", "mt-pelerin", "secure-shift", "sideshift", "simpleswap", "stealthex", "trocador", "open-bitcoin-wallet", "spark-wallet-legacy"];
    const visibleIds = filterProviders(defaultProviders, {}).map(({ id }) => id);
    for (const id of hidden) expect(visibleIds).not.toContain(id);
    expect(defaultProviders.find(({ id }) => id === "boltz")?.serviceStatus).toBe("unknown");
    expect(database().routes.some(({ providerId }) => providerId === "boltz")).toBe(false);
    for (const query of ["137", "42161", "not-a-real-asset", "US", "USD"]) {
      expect(resolveAssetQuery(query, database().routes), query).toHaveLength(0);
    }
    // Polygon is also the official POL/MATIC asset name, not a stablecoin network-only alias.
    expect(resolveAssetQuery("Polygon", database().routes).every(({ assetSymbol }) => ["POL", "MATIC"].includes(assetSymbol))).toBe(true);
  });
  it("preserves Satora lock-asset refund risk and never guarantees return of the original token", () => {
    for (const route of database().routes.filter(({ providerId }) => providerId === "satora")) {
      expect(route.refundNote).toContain("not your original stablecoin/token");
      expect(route.refundNote).toContain("specific quote, not every network");
      expect(route.refundNote).toContain("tBTC/WBTC or native RBTC");
      expect(route.notes).toContain("not a payment guarantee");
    }
  });
  it("treats stale dated limits as unknown and never rounds fractional invoice amounts", () => {
    const routes = database().routes;
    const options = { query: "USDT Polygon", amountMsat: 1000000n, invoiceNetwork: "bitcoin" as const, now };
    expect(discoverPaymentRoutes(defaultProviders, routes, { ...options, now: Date.parse("2026-11-09T23:00:00Z") / 1000 }).every(({ eligibility }) => eligibility === "limits_unknown")).toBe(true);
    expect(discoverPaymentRoutes(defaultProviders, routes, { ...options, amountMsat: 1000001n }).every(({ eligibility }) => eligibility === "fractional_satoshi")).toBe(true);
    expect(discoverPaymentRoutes(defaultProviders, routes, { ...options, amountMsat: null }).every(({ eligibility }) => eligibility === "amount_unknown")).toBe(true);
  });
  it("admits ten released wallet additions, keeping Blitz distinct and historical wallets hidden", () => {
    const expected = ["lexe", "electrum", "bitkit", "cake-wallet", "blitz-wallet", "arkade-wallet", "bitbanana", "ride-the-lightning", "thunderhub", "tether-wallet"];
    const visible = filterProviders(defaultProviders, {});
    for (const id of expected) expect(visible.some((provider) => provider.id === id), id).toBe(true);
    expect(visible.some(({ id }) => id === "open-bitcoin-wallet" || id === "spark-wallet-legacy")).toBe(false);
    expect(defaultProviders.find(({ id }) => id === "blixt")?.aliases.map((alias) => alias.toLowerCase())).not.toContain("blitz");
    expect(filterProviders(defaultProviders, { query: "Blitz" }).map(({ id }) => id)).toEqual(["blitz-wallet"]);
    expect(defaultProviders.find(({ id }) => id === "tether-wallet")?.evidence.some(({ url }) => url.includes("tether-wallet-app-releases"))).toBe(true);
    expect(defaultProviders.find(({ id }) => id === "cake-wallet")?.capabilitySummary).toContain("macOS");
    expect(discover("Ark").find(({ route }) => route.providerId === "arkade-wallet")?.eligibility).toBe("within_limits");
    const spark = discover("Spark");
    expect(spark.map(({ route }) => route.providerId).sort()).toEqual(["blink", "blitz-wallet", "cake-wallet"]);
    expect(spark.every(({ eligibility, route }) => eligibility === "limits_unknown" && !route.limits)).toBe(true);
  });
});
