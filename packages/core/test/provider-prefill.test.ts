import { describe, expect, it } from "vitest";
import { createPaymentRouteHandoff, defaultProviders, defaultPaymentRoutes, discoverPaymentRoutes } from "../src/index.js";
import { fakeInvoice } from "./fixtures.js";
const now = Date.parse("2026-10-09T00:00:00Z") / 1000;
const invoice = fakeInvoice({createdAt: now, amountHrp:"10000n"});
const route = defaultPaymentRoutes.find(r => r.providerId === "satora" && r.network === "Arbitrum" && r.assetSymbol === "USDC")!;
const provider = defaultProviders.find(p => p.id === "satora")!;
const view = discoverPaymentRoutes([provider],[route],{query:"USDC Arbitrum",invoiceNetwork:"bitcoin",amountMsat:1000000n,now})[0]!;
describe("verified browser prefill", () => {
 it("prefills FixedFloat destination invoice and exact BTC output, never source deposit amount", () => {
  const r=defaultPaymentRoutes.find(r=>r.id==="fixedfloat-usdttrc")!;
  const p=defaultProviders.find(p=>p.id==="fixedfloat")!;
  const v=discoverPaymentRoutes([p],[r],{query:"USDT",invoiceNetwork:"bitcoin",amountMsat:1000000n,now})[0]!;
  const result=createPaymentRouteHandoff(v,invoice,{now});
  expect(result.invoicePrefilled).toBe(true);
  const url=new URL(result.url);
  expect(url.searchParams.get("from")).toBe("USDTTRC");
  expect(url.searchParams.get("to")).toBe("BTCLN");
  expect(url.searchParams.get("toAmount")).toBe("0.00001");
  expect(url.searchParams.get("address")).toBe(invoice);
  expect(url.searchParams.has("fromAmount")).toBe(false);
 });
 it("never returns an unsafe fallback URL from untrusted provider metadata", () => {
  const bad = {...view,provider:{...provider,action:{...provider.action,url:"javascript:alert(1)"}}};
  expect(createPaymentRouteHandoff(bad,invoice,{now}).url).not.toMatch(/^javascript:/);
 });
 it("fills exact source chain, token, output sats and normalized external invoice", () => {
  const handoff = createPaymentRouteHandoff(view, `lightning:${invoice.toUpperCase()}`, {now});
  expect(handoff.invoicePrefilled).toBe(true);
  const url = new URL(handoff.url);
  expect(url.origin).toBe("https://app.satora.io"); expect(url.pathname).toBe("/42161:USDC/lightning:BTC");
  expect(url.searchParams.get("targetAmount")).toBe("1000"); expect(url.searchParams.get("address")).toBe(invoice);
 });
 it("never prepopulates expired, amountless, fractional, malformed or nonmainnet invoices", () => {
  for (const bad of ["not-an-invoice", fakeInvoice({createdAt:now-7200}), fakeInvoice({createdAt:now,amountHrp:""}), fakeInvoice({createdAt:now,amountHrp:"1p"}),fakeInvoice({createdAt:now,network:"tb"})]) expect(createPaymentRouteHandoff(view,bad,{now}).invoicePrefilled).toBe(false);
 });
 it("does not bypass invoice limits or trust forged eligibility", () => {
  expect(createPaymentRouteHandoff(view,fakeInvoice({createdAt:now,amountHrp:"2000n"}),{now}).invoicePrefilled).toBe(false);
 });
 it("does not guess unknown provider contracts or source networks", () => {
  expect(createPaymentRouteHandoff({...view,route:{...route,network:"Tron"}},invoice,{now}).invoicePrefilled).toBe(false);
  expect(createPaymentRouteHandoff({...view,provider:{...provider,id:"unverified-service"}},invoice,{now}).invoicePrefilled).toBe(false);
 });
});
