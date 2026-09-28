// @vitest-environment jsdom
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { fakeInvoice } from "../../core/test/fixtures.js";
import { LightningPaymentHelp } from "../src/index.js";

describe("LightningPaymentHelp", () => {
  it("opens a labeled dialog with canonical handoff, local fallbacks, and truthful provider actions", async () => {
    const user = userEvent.setup();
    const invoice = fakeInvoice({ createdAt: 1_700_000_000 });
    render(<LightningPaymentHelp invoice={invoice} now={1_700_000_001} />);

    await user.click(screen.getByRole("button", { name: "How can I pay this Lightning invoice?" }));

    const dialog = screen.getByRole("dialog", { name: "How can I pay?" });
    expect(within(dialog).getByText("Handoff available")).toBeVisible();
    expect(within(dialog).getByText(/wallet must validate the invoice/i)).toBeVisible();
    expect(within(dialog).getByRole("link", { name: "Open Lightning wallet" })).toHaveAttribute(
      "href",
      `lightning:${invoice}`
    );
    expect(within(dialog).getByRole("button", { name: "Copy invoice" })).toBeVisible();
    expect(within(dialog).getByLabelText("Lightning invoice text")).toHaveValue(invoice);
    expect(within(dialog).getByText("1,000 sats")).toBeVisible();
    expect(
      within(dialog).getByText("Copy invoice, then open Phoenix's website")
    ).toBeVisible();
    expect(dialog.innerHTML).not.toContain("phoenix:");
  });

  it("searches aliases and categories without exposing unverified routes", async () => {
    const user = userEvent.setup();
    render(<LightningPaymentHelp invoice={fakeInvoice()} now={1_700_000_001} trigger="button" />);
    await user.click(screen.getByRole("button", { name: "How can I pay?" }));

    await user.type(screen.getByRole("searchbox", { name: "Search payment providers" }), "ACINQ");
    expect(screen.getByText("Phoenix")).toBeVisible();
    expect(screen.queryByText("FixedFloat")).not.toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox", { name: "Search payment providers" }));
    await user.click(screen.getByRole("button", { name: "Exchanges" }));
    expect(screen.getByText("Kraken")).toBeVisible();
    expect(screen.queryByText("Phoenix")).not.toBeInTheDocument();
  });

  it("traps focus, closes on Escape, and restores the trigger", async () => {
    const user = userEvent.setup();
    render(<LightningPaymentHelp invoice={fakeInvoice()} now={1_700_000_001} />);
    const trigger = screen.getByRole("button", { name: "How can I pay this Lightning invoice?" });
    trigger.focus();
    await user.click(trigger);
    expect(screen.getByRole("button", { name: "Close payment help" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("keeps selectable text and an honest status when clipboard copying fails", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<LightningPaymentHelp invoice={fakeInvoice()} now={1_700_000_001} trigger="button" />);
    await user.click(screen.getByRole("button", { name: "How can I pay?" }));
    await user.click(screen.getByRole("button", { name: "Copy invoice" }));

    expect(screen.getByRole("status")).toHaveTextContent("Copy unavailable. Select the invoice text below.");
    expect(screen.getByLabelText("Lightning invoice text")).toBeVisible();
  });

  it("reports provider-copy failure instead of claiming the invoice was copied", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) }
    });
    render(<LightningPaymentHelp invoice={fakeInvoice()} now={1_700_000_001} trigger="button" />);
    await user.click(screen.getByRole("button", { name: "How can I pay?" }));
    await user.type(screen.getByRole("searchbox", { name: "Search payment providers" }), "Phoenix");
    await user.click(screen.getByRole("link", { name: /Phoenix/ }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Invoice was not copied. Return here and use manual copy."
      )
    );
  });

  it("uses a stylesheet scroll-lock class without mutating inline body styles", async () => {
    const user = userEvent.setup();
    render(<LightningPaymentHelp invoice={fakeInvoice()} now={1_700_000_001} />);
    await user.click(screen.getByRole("button", { name: "How can I pay this Lightning invoice?" }));

    expect(document.body).toHaveClass("lpk-scroll-lock");
    expect(document.body.style.overflow).toBe("");
  });

  it("blocks handoff actions for expired and invalid invoice input", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <LightningPaymentHelp invoice={fakeInvoice({ expiry: 1 })} now={1_700_000_002} trigger="button" />
    );
    await user.click(screen.getByRole("button", { name: "How can I pay?" }));
    expect(screen.getByText("This invoice has expired")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Open Lightning wallet" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close payment help" }));
    rerender(<LightningPaymentHelp invoice="data:text/html,bad" trigger="button" />);
    await user.click(screen.getByRole("button", { name: "How can I pay?" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Invoice unavailable");
    expect(screen.queryByRole("link", { name: "Open Lightning wallet" })).not.toBeInTheDocument();
  });

  it("escapes transformed host stacking contexts by portaling the modal", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <div style={{ transform: "rotate(1deg)" }}>
        <LightningPaymentHelp invoice={fakeInvoice()} now={1_700_000_001} />
      </div>
    );
    await user.click(screen.getByRole("button", { name: "How can I pay this Lightning invoice?" }));

    expect(screen.getByRole("dialog").closest(".lpk-backdrop")?.parentElement).toBe(document.body);
    expect(container.inert).toBe(true);
  });

  it("discloses affiliate links and emits handed_off rather than payment success", async () => {
    const user = userEvent.setup();
    const onHandoff = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) }
    });
    render(
      <LightningPaymentHelp
        affiliateOverrides={{
          phoenix: { url: "https://phoenix.acinq.co/?ref=host", disclosure: "Affiliate link" }
        }}
        invoice={fakeInvoice()}
        now={1_700_000_001}
        onHandoff={onHandoff}
        trigger="button"
      />
    );
    await user.click(screen.getByRole("button", { name: "How can I pay?" }));
    await user.type(screen.getByRole("searchbox", { name: "Search payment providers" }), "Phoenix");
    const providerLink = screen.getByRole("link", { name: /Phoenix/ });
    expect(providerLink).toHaveAttribute("href", "https://phoenix.acinq.co/?ref=host");
    expect(providerLink).toHaveAttribute("rel", "sponsored noopener noreferrer");
    expect(providerLink).toHaveTextContent("Affiliate link");

    await user.click(screen.getByRole("button", { name: "Copy invoice" }));
    expect(onHandoff).toHaveBeenCalledWith({ status: "handed_off", method: "copy" });
    expect(JSON.stringify(onHandoff.mock.calls)).not.toContain("paid");
  });
});
