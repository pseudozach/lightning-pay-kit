import { describe, expect, it } from "vitest";
import {
  applyAffiliateOverrides,
  defaultProviders,
  filterProviders,
  type PaymentProvider
} from "../src/index.js";

const verifiedSwap: PaymentProvider = {
  id: "example-swap",
  name: "Example Swap",
  aliases: ["example"],
  category: "swap",
  custody: "swap_based",
  platforms: ["web"],
  regions: { notes: "Availability varies." },
  action: {
    type: "copy_then_open",
    url: "https://swap.example/pay",
    label: "Copy invoice, then open Example Swap"
  },
  serviceStatus: "active",
  verificationStatus: "verified",
  lastVerifiedAt: "2026-09-01",
  evidence: [
    {
      url: "https://swap.example/docs/lightning",
      claim: "Documents arbitrary BOLT11 destinations.",
      checkedAt: "2026-09-01"
    }
  ],
  accountRequired: false,
  kycRequired: false
};

describe("provider directory", () => {
  it("rejects unsafe destinations and unknown metadata", () => {
    const unsafeRecords = [
      { ...verifiedSwap, action: { ...verifiedSwap.action, url: "javascript:alert(1)" } },
      { ...verifiedSwap, action: { ...verifiedSwap.action, url: "data:text/html,bad" } },
      { ...verifiedSwap, action: { ...verifiedSwap.action, url: "https://user:pass@swap.example/" } },
      { ...verifiedSwap, surprise: true }
    ] as unknown as PaymentProvider[];

    expect(filterProviders(unsafeRecords, { includeUnavailable: true })).toEqual([]);
  });

  it("searches aliases, filters categories, and hides unsafe-status records", () => {
    expect(filterProviders(defaultProviders, { query: "self custody" }).map(({ id }) => id)).toContain(
      "phoenix"
    );
    expect(
      filterProviders(defaultProviders, { category: "exchange" }).every(
        ({ category }) => category === "exchange"
      )
    ).toBe(true);
    expect(filterProviders(defaultProviders, {}).map(({ id }) => id)).not.toContain("boltz");
    expect(filterProviders(defaultProviders, {}).map(({ id }) => id)).not.toContain("fixedfloat");
  });

  it("filters runtime provider input through the HTTPS schema", () => {
    const unsafeRuntimeRecord = {
      ...verifiedSwap,
      action: { ...verifiedSwap.action, url: "javascript:alert(1)" }
    };

    expect(filterProviders([unsafeRuntimeRecord], {})).toEqual([]);
  });

  it("applies disclosed HTTPS affiliate destinations without changing order", () => {
    const organic = [verifiedSwap, ...defaultProviders.slice(0, 2)];
    const result = applyAffiliateOverrides(organic, {
      "example-swap": {
        url: "https://swap.example/pay?ref=host",
        disclosure: "Affiliate link"
      }
    });

    expect(result.map(({ id }) => id)).toEqual(organic.map(({ id }) => id));
    expect(result[0]).toMatchObject({
      destinationUrl: "https://swap.example/pay?ref=host",
      affiliateDisclosure: "Affiliate link"
    });
    expect(() =>
      applyAffiliateOverrides(organic, {
        "example-swap": { url: "data:text/html,bad", disclosure: "Affiliate link" }
      })
    ).toThrow();
  });
});

