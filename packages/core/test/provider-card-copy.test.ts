import { describe, expect, it } from "vitest";
import { defaultProviders, filterProviders } from "../src/index.js";

describe("canonical provider card copy", () => {
  it("keeps visible summaries short and mechanism-focused without hiding setup prerequisites", () => {
    const visible = filterProviders(defaultProviders, {});
    expect(visible.length).toBeGreaterThan(30);
    for (const provider of visible) {
      const summary = provider.capabilitySummary ?? "";
      expect(summary.length, provider.id).toBeGreaterThanOrEqual(30);
      expect(summary.length, provider.id).toBeLessThanOrEqual(140);
      expect(summary, provider.id).toMatch(/^[^.!?\n]+\.$/);
      expect(summary, provider.id).not.toMatch(
        /self[- ]custod|\bcustodial\b|\bLDK\b|\bNeutrino\b|\bVTXOs?\b|\bRFQ\b|\bSDK\b|\battested\b|account|region|\bUS only\b/i
      );
      expect(summary, provider.id).toMatch(/\b(pay\w*|send\w*|withdraw\w*|swap\w*)\b/i);
    }

    const summaryFor = (id: string) => visible.find(provider => provider.id === id)?.capabilitySummary;
    expect(summaryFor("bitbanana")).toMatch(/connected .*backend|connected .*node/i);
    expect(summaryFor("ride-the-lightning")).toMatch(/connected .*node/i);
    expect(summaryFor("thunderhub")).toMatch(/connected .*LND node|LND node connected/i);
    expect(summaryFor("bluewallet")).toMatch(/fixed-amount.*Boltz.*LNDHub.*node/i);
    expect(summaryFor("cake-wallet")).toMatch(/iOS.*Android.*macOS.*Windows.*Linux/i);
    expect(summaryFor("arkade-wallet")).toMatch(/fixed-amount.*solver/i);
    expect(summaryFor("breez")).toMatch(/maintenance/i);
    expect(summaryFor("cash-app")).toMatch(/\$999.*7-day/);
    expect(summaryFor("fixedfloat")).toMatch(/authenticated quote/i);
  });
});
