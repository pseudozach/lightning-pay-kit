// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LightningPaymentHelp } from "../src/index.js";
import { fakeInvoice } from "../../core/test/fixtures.js";
afterEach(cleanup);
it("presents route refund conditions as collapsed neutral provider terms, not red warnings", () => {
  const now = Date.parse("2026-10-10T00:00:00Z") / 1000;
  render(<LightningPaymentHelp invoice={fakeInvoice({ createdAt: now, amountHrp: "10000n" })} now={now} />);
  fireEvent.click(screen.getByRole("button", { name: /How can I pay/i }));
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "USDT Tron" } });
  const summaries = screen.getAllByText("Provider terms apply. Review fees, limits and refund conditions before depositing.");
  for (const summary of summaries) {
    expect(summary.tagName).toBe("SUMMARY");
    const details = summary.closest("details")!;
    expect(details).not.toHaveAttribute("open");
    expect(details.querySelector("p")).not.toBeVisible();
    expect(details.querySelector("p")?.textContent).toBeTruthy();
  }
  expect(screen.queryAllByText("Refund warning:")).toHaveLength(0);
  expect(document.querySelectorAll(".lpk-route-refund")).toHaveLength(0);
  expect(screen.getByRole("link", { name: /Check limits with FixedFloat/ })).toBeVisible();
});
