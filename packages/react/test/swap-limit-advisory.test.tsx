// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LightningPaymentHelp } from "../src/index.js";
import { fakeInvoice } from "../../core/test/fixtures.js";

afterEach(cleanup);
it("warns about invoice limits on ordinary swap-provider browsing", () => {
  const now = Date.parse("2026-10-09T00:00:00Z") / 1000;
  render(<LightningPaymentHelp invoice={fakeInvoice({ createdAt: now, amountHrp: "2u" })} now={now} trigger="button" />);
  fireEvent.click(screen.getByRole("button", { name: "How to pay this invoice" }));
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Satora" } });
  expect(screen.getByRole("link", { name: /Satora/ })).toHaveTextContent("Check invoice limits: search your coin and network");
});
