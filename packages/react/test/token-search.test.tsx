// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { fakeInvoice } from "../../core/test/fixtures.js";
import { LightningPaymentHelp } from "../src/index.js";

describe("token search discoverability", () => {
  it("tells the user the existing search accepts coins as well as wallets and countries", async () => {
    const user = userEvent.setup();
    render(<LightningPaymentHelp invoice={fakeInvoice()} now={1_700_000_001} trigger="button" />);
    await user.click(screen.getByRole("button", { name: "How to pay this invoice" }));
    expect(screen.getByRole("searchbox", { name: "Search payment providers" }))
      .toHaveAttribute("placeholder", "Search wallets, coins (USDT), or country…");
  });
});

const now = Date.parse("2026-10-08T18:00:00Z") / 1000;
// Injected test-only limits; not claims about FixedFloat's real commercial limits.
const routes = [{
  id: "fixture-usdt-ethereum", providerId: "fixedfloat", assetSymbol: "USDT",
  assetName: "Tether", network: "Ethereum", aliases: ["ERC20"],
  lastVerifiedAt: "2026-10-08",
  evidence: [{ url: "https://example.com/routes", claim: "Synthetic test route.", checkedAt: "2026-10-08" }],
  limits: { minimumSats: "10000", checkedAt: "2026-10-08", sourceUrl: "https://example.com/limits" }
}];

describe("invoice-aware token routes", () => {
  it("finds token/network paths and blocks a handoff below a known payout minimum", async () => {
    const user = userEvent.setup();
    render(<LightningPaymentHelp
      invoice={fakeInvoice({ createdAt: now, amountHrp: "10u" })} now={now}
      paymentRoutes={routes} trigger="button"
    />);
    await user.click(screen.getByRole("button", { name: "How to pay this invoice" }));
    await user.type(screen.getByRole("searchbox"), "USDT");
    expect(screen.getByRole("heading", { name: "Pay with USDT" })).toBeVisible();
    expect(screen.getByText("USDT · Ethereum → Lightning")).toBeVisible();
    expect(screen.getByText(/Minimum: 10,000 sats/)).toBeVisible();
    expect(screen.getByText(/Below provider minimum/)).toBeVisible();
    expect(screen.queryByRole("link", { name: /Continue with FixedFloat/ })).not.toBeInTheDocument();
  });
});
