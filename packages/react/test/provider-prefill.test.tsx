// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LightningPaymentHelp } from "../src/index.js";
import { fakeInvoice } from "../../core/test/fixtures.js";
afterEach(cleanup);
it("keeps a below-minimum Satora invoice in route selection instead of silently opening its homepage", () => {
 const now=Date.parse("2026-10-09T00:00:00Z")/1000;
 const invoice=fakeInvoice({createdAt:now,amountHrp:"2000n"});
 const onHandoff=vi.fn();
 render(<LightningPaymentHelp invoice={invoice} now={now} onHandoff={onHandoff}/>);
 fireEvent.click(screen.getByRole("button",{name:/How can I pay/i}));
 const link=screen.getByRole("link",{name:/Satora/});
 expect(link.getAttribute("href")).not.toBe("https://app.satora.io/");
 fireEvent.click(link);
 expect(screen.getByRole("searchbox")).toHaveValue("USDC");
 expect(screen.getByRole("region", {name:"Token payment routes"})).toBeDefined();
 expect(onHandoff).not.toHaveBeenCalled();
});
it("prefills Satora from the ordinary directory card without a token search", () => {
 const now=Date.parse("2026-10-09T00:00:00Z")/1000;
 const invoice=fakeInvoice({createdAt:now,amountHrp:"10000n"});
 const writeText=vi.fn().mockResolvedValue(undefined);
 Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText}});
 render(<LightningPaymentHelp invoice={invoice} now={now}/>);
 fireEvent.click(screen.getByRole("button",{name:/How can I pay/i}));
 const link=screen.getByRole("link",{name:/Satora/});
 const url=new URL(link.getAttribute("href")!);
 expect(url.pathname).toBe("/42161:USDC/lightning:BTC");
 expect(url.searchParams.get("targetAmount")).toBe("1000");
 expect(url.searchParams.get("address")).toBe(invoice);
 expect(link).toHaveTextContent("Starts with USDC on Arbitrum");
 fireEvent.click(link);
 expect(writeText).not.toHaveBeenCalled();
});
it("prefills FixedFloat from its ordinary directory and name-search cards", () => {
 const now=Date.parse("2026-10-09T00:00:00Z")/1000;
 const invoice=fakeInvoice({createdAt:now,amountHrp:"10000n"});
 const writeText=vi.fn().mockResolvedValue(undefined);
 Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText}});
 render(<LightningPaymentHelp invoice={invoice} now={now} affiliateOverrides={{fixedfloat:"host-ref"}}/>);
 fireEvent.click(screen.getByRole("button",{name:/How can I pay/i}));
 for (const query of ["", "FixedFloat"]) {
  fireEvent.change(screen.getByRole("searchbox"),{target:{value:query}});
  const link=screen.getByRole("link",{name:/FixedFloat/});
  const url=new URL(link.getAttribute("href")!);
  expect(url.searchParams.get("address")).toBe(invoice);
  expect(url.searchParams.get("from")).toBe("USDTTRC");
  expect(url.searchParams.get("to")).toBe("BTCLN");
  expect(url.searchParams.get("toAmount")).toBe("0.00001");
  expect(url.searchParams.get("ref")).toBe("host-ref");
  expect(link).toHaveTextContent("USDT on Tron");
  fireEvent.click(link);
 }
 expect(writeText).not.toHaveBeenCalled();
});
it.each([
 ["disabled", null, null],
 ["replaced", "host-ref", "host-ref"],
 ["protected", {url:"https://ff.io/?ref=host-ref&address=shadow&to=XMR&toAmount=5",disclosure:"Host referral"}, "host-ref"]
] as const)("keeps ordinary FixedFloat %s referral overrides consistent with protected invoice fields", (_label, override, ref) => {
 const now=Date.parse("2026-10-09T00:00:00Z")/1000;
 const invoice=fakeInvoice({createdAt:now,amountHrp:"10000n"});
 render(<LightningPaymentHelp invoice={invoice} now={now} affiliateOverrides={{fixedfloat:override}}/>);
 fireEvent.click(screen.getByRole("button",{name:/How can I pay/i}));
 const url=new URL(screen.getByRole("link",{name:/FixedFloat/}).getAttribute("href")!);
 expect(url.searchParams.get("ref")).toBe(ref);
 expect(url.searchParams.get("address")).toBe(invoice);
 expect(url.searchParams.get("to")).toBe("BTCLN");
 expect(url.searchParams.get("toAmount")).toBe("0.00001");
});
it("respects an offsite FixedFloat destination override without rewriting it", () => {
 const now=Date.parse("2026-10-09T00:00:00Z")/1000;
 const invoice=fakeInvoice({createdAt:now,amountHrp:"10000n"});
 render(<LightningPaymentHelp invoice={invoice} now={now} affiliateOverrides={{fixedfloat:{url:"https://example.com/custom",disclosure:"Host link"}}}/>);
 fireEvent.click(screen.getByRole("button",{name:/How can I pay/i}));
 expect(screen.getByRole("link",{name:/FixedFloat/})).toHaveAttribute("href","https://example.com/custom");
 expect(screen.getByRole("link",{name:/FixedFloat/})).not.toHaveTextContent("Invoice and exact amount prefilled");
});
it.each([
 ["default", undefined, ["pmdxabka"]],
 ["disabled", null, []],
 ["replaced", "host-ref", ["host-ref"]],
 ["protected", {url:"https://ff.io/?ref=host-ref&ref=shadow-ref&address=shadow&from=ETH&to=XMR&toAmount=5",disclosure:"Host referral"}, ["host-ref"]]
] as const)("keeps token-route FixedFloat %s referrals and invoice fields consistent with the directory", (_label, override, refs) => {
 const now=Date.parse("2026-10-09T00:00:00Z")/1000;
 const invoice=fakeInvoice({createdAt:now,amountHrp:"10000n"});
 const writeText=vi.fn().mockResolvedValue(undefined);
 Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText}});
 render(<LightningPaymentHelp invoice={invoice} now={now} {...(override===undefined?{}:{affiliateOverrides:{fixedfloat:override}})}/>);
 fireEvent.click(screen.getByRole("button",{name:/How can I pay/i}));
 const directoryURL=screen.getByRole("link",{name:/FixedFloat/}).getAttribute("href");
 fireEvent.change(screen.getByRole("searchbox"),{target:{value:"USDT Tron"}});
 const link=screen.getByRole("link",{name:/Check limits with FixedFloat/});
 const url=new URL(link.getAttribute("href")!);
 expect(url.searchParams.getAll("ref")).toEqual(refs);
 expect(url.href).toBe(directoryURL);
 expect(url.searchParams.get("address")).toBe(invoice);
 expect(url.searchParams.get("from")).toBe("USDTTRC");
 expect(url.searchParams.get("to")).toBe("BTCLN");
 expect(url.searchParams.get("toAmount")).toBe("0.00001");
 fireEvent.click(link);
 expect(writeText).not.toHaveBeenCalled();
});
it("retains the disclosed FixedFloat referral with the verified prefill link", () => {
 const now=Date.parse("2026-10-09T00:00:00Z")/1000;
 const invoice=fakeInvoice({createdAt:now,amountHrp:"100000n"});
 render(<LightningPaymentHelp invoice={invoice} now={now}/>);
 fireEvent.click(screen.getByRole("button",{name:/How can I pay/i}));
 fireEvent.change(screen.getByRole("searchbox"),{target:{value:"USDT Tron"}});
 const url=new URL(screen.getByRole("link",{name:/Check limits with FixedFloat/i}).getAttribute("href")!);
 expect(url.searchParams.get("address")).toBe(invoice);
 expect(url.searchParams.get("toAmount")).toBe("0.0001");
 expect(url.searchParams.get("ref")).toBeTruthy();
});
it("hands off the exact invoice without requiring or overwriting the clipboard", () => {
 const now=Date.parse("2026-10-09T00:00:00Z")/1000;
 const invoice=fakeInvoice({createdAt:now,amountHrp:"10000n"});
 const writeText=vi.fn().mockResolvedValue(undefined);
 Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText}});
 render(<LightningPaymentHelp invoice={invoice} now={now}/>);
 fireEvent.click(screen.getByRole("button",{name:/How can I pay/i}));
 fireEvent.change(screen.getByRole("searchbox"),{target:{value:"USDC Arbitrum"}});
 const link=screen.getByRole("link",{name:/Continue with Satora/i});
 const url=new URL(link.getAttribute("href")!);
 expect(url.pathname).toBe("/42161:USDC/lightning:BTC");
 expect(url.searchParams.get("address")).toBe(invoice);
 fireEvent.click(link); expect(writeText).not.toHaveBeenCalled();
});
