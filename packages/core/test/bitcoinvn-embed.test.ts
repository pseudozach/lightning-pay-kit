import { describe, expect, it } from "vitest";
import { createBitcoinVnEmbedUrl, type AffiliateOverrides } from "../src/index.js";

describe("pure BitcoinVN embed URL builder", () => {
  it("builds only the verified swap embed URL with the shared bundled referral", () => {
    expect(createBitcoinVnEmbedUrl()).toBe("https://bitcoinvn.io/embed/swap?settle=btcln&ref=efd36219af705e28");
  });

  it("uses the same host overrides including legacy disclosed URLs and null opt-out", () => {
    const affiliateOverrides: AffiliateOverrides = { bitcoinvn: "host&address=not-an-invoice", fixedfloat: "host-ff" };
    const url = new URL(createBitcoinVnEmbedUrl({ affiliateOverrides }));
    expect(url.origin).toBe("https://bitcoinvn.io");
    expect(url.pathname).toBe("/embed/swap");
    expect([...url.searchParams.keys()]).toEqual(["settle", "ref"]);
    expect(url.searchParams.getAll("ref")).toEqual(["host&address=not-an-invoice"]);
    expect(createBitcoinVnEmbedUrl({ affiliateOverrides: { bitcoinvn: null } })).toBe("https://bitcoinvn.io/embed/swap?settle=btcln");
    expect(createBitcoinVnEmbedUrl({ affiliateOverrides: { bitcoinvn: { url: "https://bitcoinvn.io/?ref=legacy&ref=shadow&settle=xmr&address=evil&toAmount=999", disclosure: "Host affiliate" } } })).toBe("https://bitcoinvn.io/embed/swap?settle=btcln&ref=legacy");
    expect(createBitcoinVnEmbedUrl({ affiliateOverrides: { bitcoinvn: { url: "https://bitcoinvn.io/", disclosure: "Host affiliate" } } })).toBe("https://bitcoinvn.io/embed/swap?settle=btcln");
  });

  it("rejects unsafe or non-BitcoinVN URL overrides rather than silently embedding another origin", () => {
    for (const url of ["javascript:alert(1)", "http://bitcoinvn.io/?ref=host", "https://user:pass@bitcoinvn.io/?ref=host", "https://host.example/?ref=host"]) {
      expect(() => createBitcoinVnEmbedUrl({ affiliateOverrides: { bitcoinvn: { url, disclosure: "Host affiliate" } } })).toThrow();
    }
  });
});
