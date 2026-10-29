import { expect, it } from "vitest";
import { defaultPaymentRoutes, defaultProviders, discoverPaymentRoutes, createPaymentRouteHandoff } from "../src/index.js";
import { fakeInvoice } from "./fixtures.js";

it("discovers AQUA Liquid funds with explicit USDt conversion context, never a direct SideSwap Lightning route", () => {
  const now = Date.parse("2026-10-24T00:00:00Z") / 1000;
  for (const query of ["Liquid", "L-BTC", "LBTC", "USDt Liquid", "Liquid USDT"]) {
    const views = discoverPaymentRoutes(defaultProviders, defaultPaymentRoutes, { query, amountMsat: 1000000n, invoiceNetwork: "bitcoin", now });
    const aqua = views.find(view => view.provider.id === "aqua");
    expect(aqua, query).toBeDefined();
    expect(aqua?.eligibility).toBe("limits_unknown");
    expect(createPaymentRouteHandoff(aqua!, fakeInvoice({ createdAt: now }), { now }).invoicePrefilled).toBe(false);
    expect(views.some(view => view.provider.id === "sideswap")).toBe(false);
  }
  const usdt = defaultPaymentRoutes.find(route => route.id === "aqua-usdt-liquid");
  expect(usdt?.notes).toMatch(/USDt.*L-BTC.*SideSwap.*then.*Lightning/i);
  expect(usdt?.notes).toMatch(/not a direct.*Lightning/i);
});
