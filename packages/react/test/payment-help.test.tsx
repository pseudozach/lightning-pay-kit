// @vitest-environment jsdom
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { fakeInvoice } from "../../core/test/fixtures.js";
import { LightningPaymentHelp } from "../src/index.js";

describe("LightningPaymentHelp", () => {
  it("opens directly to the searchable provider directory without invoice details", async () => {
    const user = userEvent.setup();
    render(<LightningPaymentHelp invoice={fakeInvoice({ createdAt: 1_700_000_000 })} now={1_700_000_001} />);

    await user.click(screen.getByRole("button", { name: "How can I pay this Lightning invoice?" }));

    const dialog = screen.getByRole("dialog", { name: "How can I pay?" });
    expect(within(dialog).getByRole("heading", { name: "Provider directory" })).toBeVisible();
    expect(within(dialog).getByRole("searchbox", { name: "Search payment providers" })).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Wallets" })).toBeVisible();
    expect(within(dialog).getByText("Phoenix")).toBeVisible();
    expect(within(dialog).queryByText(/choose a handoff method/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Handoff available")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("link", { name: "Open Lightning wallet" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Copy invoice" })).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Lightning invoice text")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Lightning invoice QR code")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Where to continue")).not.toBeInTheDocument();
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

  it("reports provider-copy failure concisely without restoring invoice details", async () => {
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
      expect(screen.getByRole("status")).toHaveTextContent("Invoice was not copied.")
    );
    expect(screen.queryByLabelText("Lightning invoice text")).not.toBeInTheDocument();
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

    await user.click(providerLink);
    expect(onHandoff).toHaveBeenCalledWith({
      status: "handed_off",
      method: "provider_https",
      providerId: "phoenix"
    });
    expect(JSON.stringify(onHandoff.mock.calls)).not.toContain("paid");
  });
});
