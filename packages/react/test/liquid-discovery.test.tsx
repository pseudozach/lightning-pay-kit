// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LightningPaymentHelp } from "../src/index.js";
import { fakeInvoice } from "../../core/test/fixtures.js";
afterEach(cleanup);
it("shows the two-step Liquid USDt conversion before the user opens AQUA", () => {
 const now=Date.parse("2026-10-24T00:00:00Z")/1000;
 render(<LightningPaymentHelp invoice={fakeInvoice({createdAt:now})} now={now}/>);
 fireEvent.click(screen.getByRole("button",{name:/How can I pay/i}));
 fireEvent.change(screen.getByRole("searchbox"),{target:{value:"USDT Liquid"}});
 expect(screen.getByRole("link",{name:/Check limits with AQUA/})).toHaveAttribute("href","https://aqua.net/");
 const context=screen.getByText(/Two steps in AQUA:/);
 expect(context.closest("details")).toBeNull();
 expect(context).toHaveTextContent(/SideSwap is not a direct USDt-to-Lightning/);
});
