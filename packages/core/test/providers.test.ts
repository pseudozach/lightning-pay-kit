import { describe, expect, it } from "vitest";
import {
  applyAffiliateOverrides,
  defaultProviders,
  filterProviders,
  providerDatabaseInfo,
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
  it("uses current official destinations and mechanism-focused summaries", () => {
    const providers = defaultProviders as readonly (PaymentProvider & {
      capabilitySummary?: string;
    })[];
    const aqua = providers.find(({ id }) => id === "aqua");
    const blueWallet = providers.find(({ id }) => id === "bluewallet");

    expect(aqua?.action.url).toBe("https://aqua.net/");
    expect(blueWallet?.serviceStatus).toBe("active");
    expect(blueWallet?.capabilitySummary).toBe(
      "Arkade pays fixed-amount invoices through Boltz swaps; LNDHub connects to your node."
    );
    expect(blueWallet?.evidence.map(({ url }) => url)).toContain(
      "https://github.com/BlueWallet/BlueWallet/blob/8.0.1/class/wallets/lightning-ark-wallet.ts#L635-L675"
    );
    const visible = providers.filter(
      ({ serviceStatus, verificationStatus }) =>
        verificationStatus === "verified" && ["active", "maintenance"].includes(serviceStatus)
    );
    for (const provider of visible) {
      expect(provider.custody, `${provider.name} must expose custody, not its payment mechanism`).not.toBe(
        "swap_based"
      );
      expect(provider.capabilitySummary, provider.id).toMatch(/^.{30,100}$/);
      expect(provider.capabilitySummary, provider.id).not.toMatch(
        /copy invoice|open .*website|^configurable$|\b(?:paste|scan|enter|submit)\b|BOLT11|[—–]/i
      );
    }
  });

  it("covers the researched exchange ecosystem without exposing unverified routes", () => {
    const visibleIds = filterProviders(defaultProviders, {}).map(({ id }) => id);

    expect(visibleIds).toEqual(
      expect.arrayContaining([
        "binance",
        "bitfinex",
        "coinbase",
        "coincorner",
        "kraken",
        "lnmarkets",
        "nicehash",
        "river"
      ])
    );
    expect(defaultProviders.length).toBeGreaterThanOrEqual(35);
    expect(
      filterProviders(defaultProviders, { category: "exchange" }).length
    ).toBeGreaterThanOrEqual(10);
    for (const id of ["bitget", "bitso", "kucoin", "relai", "speed"]) {
      expect(visibleIds).not.toContain(id);
    }
    expect(defaultProviders.map(({ id }) => id)).toEqual(
      expect.arrayContaining(["bitget", "bitso", "kucoin"])
    );
    expect(providerDatabaseInfo.directorySources.map(({ url }) => url)).toEqual(
      expect.arrayContaining([
        "https://github.com/theDavidCoen/LightningExchanges",
        "https://github.com/cointastical/Exchanges-With-LN"
      ])
    );
  });

  it("searches the human summary and structured Lightning mechanism", () => {
    expect(filterProviders(defaultProviders, { query: "LSP" }).map(({ id }) => id)).toEqual(
      expect.arrayContaining(["blixt", "breez"])
    );
    expect(
      filterProviders(defaultProviders, { query: "exchange withdrawal" }).length
    ).toBeGreaterThan(0);
  });

  it("treats exact country searches as availability filters and ranks local providers first", () => {
    const usOnly = {
      ...verifiedSwap,
      id: "us-only",
      name: "US Only",
      regions: { scope: "country_specific" as const, include: ["US"] }
    };
    const philippinesOnly = {
      ...verifiedSwap,
      id: "philippines-only",
      name: "Philippines Only",
      regions: { scope: "country_specific" as const, include: ["PH"] }
    };
    const global = {
      ...verifiedSwap,
      id: "global",
      name: "Global",
      regions: { scope: "global" as const }
    };
    const globalExceptUs = {
      ...verifiedSwap,
      id: "global-except-us",
      name: "Global Except US",
      regions: { scope: "global_with_exclusions" as const, exclude: ["US"] }
    };
    const unknown = {
      ...verifiedSwap,
      id: "unknown-region",
      name: "Unknown Region",
      regions: { scope: "unknown" as const }
    };
    const providers = [global, philippinesOnly, globalExceptUs, usOnly, unknown];

    expect(filterProviders(providers, { query: "United States" }).map(({ id }) => id)).toEqual([
      "us-only",
      "global"
    ]);
    expect(filterProviders(providers, { query: "US" }).map(({ id }) => id)).toEqual([
      "us-only",
      "global"
    ]);
    expect(filterProviders(providers, { query: "USA" }).map(({ id }) => id)).toEqual([
      "us-only",
      "global"
    ]);
    expect(filterProviders(providers, { query: "Philippines" }).map(({ id }) => id)).toEqual([
      "philippines-only",
      "global",
      "global-except-us"
    ]);
    expect(filterProviders(providers, { query: "PH" }).map(({ id }) => id)).toEqual([
      "philippines-only",
      "global",
      "global-except-us"
    ]);
  });

  it("uses evidence-backed country metadata in the bundled directory", () => {
    const usResults = filterProviders(defaultProviders, { query: "USA" }).map(({ id }) => id);
    expect(usResults.slice(0, 3)).toEqual(["cash-app", "river", "strike"]);
    expect(usResults).not.toContain("fixedfloat");
    expect(usResults).not.toContain("coinbase");

    const philippinesResults = filterProviders(defaultProviders, { query: "Philippines" }).map(({ id }) => id);
    expect(philippinesResults[0]).toBe("strike");
    expect(philippinesResults).toContain("phoenix");
    expect(philippinesResults).not.toContain("pouch");
    expect(philippinesResults).not.toContain("coinbase");
    expect(philippinesResults).not.toContain("aqua");

    for (const query of ["Puerto Rico", "PR", "PRI"]) {
      const puertoRicoResults = filterProviders(defaultProviders, { query }).map(({ id }) => id);
      expect(puertoRicoResults[0]).toBe("strike");
    }

    for (const query of ["North Korea", "KP", "PRK"]) {
      const restrictedResults = filterProviders(defaultProviders, { query }).map(({ id }) => id);
      expect(restrictedResults).not.toContain("fixedfloat");
      expect(restrictedResults).not.toContain("blink");
    }
  });

  it("rejects contradictory and unmaintained region metadata", () => {
    const invalidRegions = [
      { ...verifiedSwap, id: "unknown-with-include", regions: { scope: "unknown", include: ["KP"] } },
      { ...verifiedSwap, id: "global-with-exclude", regions: { scope: "global", exclude: ["KP"] } },
      {
        ...verifiedSwap,
        id: "missing-global-exclusions",
        regions: { scope: "global_with_exclusions" }
      },
      {
        ...verifiedSwap,
        id: "unmaintained-country",
        regions: { scope: "country_specific", include: ["ZZ"] }
      },
      {
        ...verifiedSwap,
        id: "duplicate-country",
        regions: { scope: "country_specific", include: ["US", "US"] }
      }
    ] as unknown as PaymentProvider[];

    expect(
      filterProviders(invalidRegions, { query: "North Korea", includeUnavailable: true })
    ).toEqual([]);
  });

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
    expect(filterProviders(defaultProviders, {}).map(({ id }) => id)).toContain("fixedfloat");
  });

  it("filters runtime provider input through the HTTPS schema", () => {
    const unsafeRuntimeRecord = {
      ...verifiedSwap,
      action: { ...verifiedSwap.action, url: "javascript:alert(1)" }
    };

    expect(filterProviders([unsafeRuntimeRecord], {})).toEqual([]);
  });

  it("applies disclosed HTTPS affiliate destinations without changing order", () => {
    const fixedFloat = defaultProviders.find(({ id }) => id === "fixedfloat");
    expect(fixedFloat).toBeDefined();
    if (!fixedFloat) return;
    const organic = [verifiedSwap, fixedFloat, ...defaultProviders.slice(0, 2)];
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
    expect(result[1]).toMatchObject({
      destinationUrl: "https://ff.io/?ref=pmdxabka",
      affiliateDisclosure: "Affiliate"
    });
    expect(applyAffiliateOverrides([fixedFloat], { fixedfloat: null })[0]).toMatchObject({
      destinationUrl: "https://ff.io/"
    });
    expect(applyAffiliateOverrides([fixedFloat], { fixedfloat: null })[0]?.affiliateDisclosure).toBeUndefined();
    const unrelatedRecord = {
      ...verifiedSwap,
      id: "fixedfloat",
      action: { ...verifiedSwap.action, url: "https://swap.example/pay" }
    };
    expect(applyAffiliateOverrides([unrelatedRecord])[0]).toMatchObject({
      destinationUrl: "https://swap.example/pay"
    });
    expect(applyAffiliateOverrides([unrelatedRecord])[0]?.affiliateDisclosure).toBeUndefined();
    expect(() =>
      applyAffiliateOverrides(organic, {
        "example-swap": { url: "data:text/html,bad", disclosure: "Affiliate link" }
      })
    ).toThrow();
  });
});

