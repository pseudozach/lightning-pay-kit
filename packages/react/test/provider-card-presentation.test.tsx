// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LightningPaymentHelp } from "../src/index.js";
import { fakeInvoice } from "../../core/test/fixtures.js";

afterEach(cleanup);

it("gives provider cards one description followed by concise metadata and limit guidance", () => {
  const now = Date.parse("2026-10-09T00:00:00Z") / 1000;
  render(<LightningPaymentHelp invoice={fakeInvoice({ createdAt: now, amountHrp: "2000n" })} now={now} trigger="button" />);
  fireEvent.click(screen.getByRole("button", { name: "How to pay this invoice" }));
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Sato" } });
  const card = screen.getByRole("link", { name: /Satora/ });
  const descriptions = card.querySelectorAll(".lpk-provider-copy > span:not(.lpk-provider-title, .lpk-provider-meta)");
  expect(descriptions).toHaveLength(1);
  expect(card.querySelector(".lpk-provider-meta")?.textContent).not.toContain("Choose coin/network");
  expect(card.querySelector(".lpk-provider-meta")).toHaveTextContent("Check coin limits");
  expect(card.querySelector(".lpk-provider-meta")).toHaveTextContent("Refund asset varies");
  const wallet = screen.getByRole("link", { name: /Wallet of Satoshi/ });
  expect(wallet.querySelector(".lpk-provider-meta")).toHaveTextContent("Custody options");
  expect(wallet.querySelector(".lpk-provider-meta")).toHaveTextContent("Modes vary by region");
});

it("highlights the service type as the first pill on every card", () => {
  const now = Date.parse("2026-10-09T00:00:00Z") / 1000;
  render(<LightningPaymentHelp invoice={fakeInvoice({ createdAt: now })} now={now} trigger="button" />);
  fireEvent.click(screen.getByRole("button", { name: "How to pay this invoice" }));
  const cards = screen.getAllByRole("link").filter(card => card.classList.contains("lpk-provider"));
  expect(cards.length).toBeGreaterThan(20);
  for (const card of cards) {
    const firstPill = card.querySelector(".lpk-provider-meta > :first-child");
    expect(firstPill).toHaveClass("lpk-meta-pill-primary");
    expect(firstPill?.textContent).toMatch(/^(Wallet|Swap|Exchange|Payment app)$/);
  }
});
