// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BitcoinVNExchangeWidget, LightningPaymentHelp } from "../src/index.js";
import { fakeInvoice } from "../../core/test/fixtures.js";
afterEach(cleanup);
it("uses the shared default, replacement and disabled BitcoinVN referral", () => {
 const { rerender } = render(<BitcoinVNExchangeWidget />);
 const frame = screen.getByTitle("BitcoinVN exchange widget");
 expect(frame.getAttribute("src")).toBe("https://bitcoinvn.io/embed/swap?settle=btcln&ref=efd36219af705e28");
 expect(screen.getByText("Affiliate")).toBeTruthy();
 rerender(<BitcoinVNExchangeWidget affiliateOverrides={{ bitcoinvn: { url: "https://bitcoinvn.io/?ref=host-code", disclosure: "Affiliate" } }} />);
 expect(frame.getAttribute("src")).toBe("https://bitcoinvn.io/embed/swap?settle=btcln&ref=host-code");
 rerender(<BitcoinVNExchangeWidget affiliateOverrides={{ bitcoinvn: "short-code" }} />);
 expect(frame.getAttribute("src")).toBe("https://bitcoinvn.io/embed/swap?settle=btcln&ref=short-code");
 rerender(<BitcoinVNExchangeWidget affiliateOverrides={{ bitcoinvn: null }} />);
 expect(frame.getAttribute("src")).toBe("https://bitcoinvn.io/embed/swap?settle=btcln");
 expect(screen.queryByText("Affiliate")).toBeNull();
});
it("accepts only its own window, exact origin, message type and finite positive numeric height", () => {
 render(<BitcoinVNExchangeWidget />);
 const frame = screen.getByTitle("BitcoinVN exchange widget");
 if (!(frame instanceof HTMLIFrameElement)) throw new Error("Expected an iframe.");
 const send = (height: unknown, origin = "https://bitcoinvn.io", source = frame.contentWindow, type = "chadshift-embed-resize") => fireEvent(window, new MessageEvent("message", { origin, source, data: { type, height } }));
 send(600); expect(frame.style.height).toBe("600px");
 for (const height of [0, -1, NaN, Infinity, "900", null, true]) { send(height); expect(frame.style.height).toBe("600px"); }
 send(900, "https://bitcoinvn.io.attacker.example"); expect(frame.style.height).toBe("600px");
 send(900, "https://bitcoinvn.io", window); expect(frame.style.height).toBe("600px");
 send(900, "https://bitcoinvn.io", frame.contentWindow, "other"); expect(frame.style.height).toBe("600px");
 send(10001); expect(frame.style.height).toBe("10000px");
});
it("removes its resize subscription on unmount", () => {
 const remove = vi.spyOn(window, "removeEventListener");
 const { unmount } = render(<BitcoinVNExchangeWidget />); unmount();
 expect(remove).toHaveBeenCalledWith("message", expect.any(Function)); remove.mockRestore();
});
it("loads no widget until explicitly selected and shares the host referral with the directory link", () => {
 const now = Date.parse("2026-10-09T00:00:00Z") / 1000;
 render(<LightningPaymentHelp invoice={fakeInvoice({ createdAt: now, amountHrp: "10000n" })} now={now} affiliateOverrides={{ bitcoinvn: { url: "https://bitcoinvn.io/?ref=site-code", disclosure: "Affiliate" } }} />);
 expect(screen.queryByTitle("BitcoinVN exchange widget")).toBeNull();
 fireEvent.click(screen.getByRole("button", { name: /How can I pay/ }));
 fireEvent.change(screen.getByRole("searchbox"), { target: { value: "BitcoinVN" } });
 expect(screen.getByRole("link", { name: /BitcoinVN/ }).getAttribute("href")).toContain("ref=site-code");
 expect(screen.queryByTitle("BitcoinVN exchange widget")).toBeNull();
 fireEvent.click(screen.getByRole("link", { name: /BitcoinVN/ }));
 expect(screen.getByTitle("BitcoinVN exchange widget").getAttribute("src")).toBe("https://bitcoinvn.io/embed/swap?settle=btcln&ref=site-code");
 fireEvent.click(screen.getByRole("button", { name: "Close BitcoinVN exchange widget" }));
 expect(screen.queryByTitle("BitcoinVN exchange widget")).toBeNull();
});
