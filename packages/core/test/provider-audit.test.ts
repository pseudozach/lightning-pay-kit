import { describe, expect, it } from "vitest";
import {
  auditProviderMetadata,
  collectProviderUrls,
  defaultProviders
} from "../src/index.js";
import providerSchema from "../src/data/providers.schema.json";

describe("provider database audit", () => {
  it("collects action and evidence links with their provider IDs", () => {
    const links = collectProviderUrls(defaultProviders);

    expect(links).toContainEqual({
      providerId: "aqua",
      kind: "action",
      url: "https://aqua.net/"
    });
    expect(links.some(({ providerId, kind }) => providerId === "bluewallet" && kind === "evidence")).toBe(true);
  });

  it("flags stale research and generic card copy deterministically", () => {
    const stale = defaultProviders.map((provider) =>
      provider.id === "aqua"
        ? { ...provider, capabilitySummary: "Copy invoice, then open AQUA's website" }
        : provider
    );
    const issues = auditProviderMetadata(stale, new Date("2027-02-01T00:00:00Z"), 90);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ providerId: "aqua", kind: "generic_summary" }),
        expect.objectContaining({ providerId: "aqua", kind: "stale_verification" })
      ])
    );
  });

  it("rejects impossible dates and verified records that still disclaim verification", () => {
    const provider = defaultProviders[0];
    expect(provider).toBeDefined();
    if (!provider) return;

    const issues = auditProviderMetadata(
      [
        {
          ...provider,
          serviceStatus: "active",
          verificationStatus: "verified",
          lastVerifiedAt: "2026-99-99",
          regions: { notes: "Needs a final current manual capability review." }
        }
      ],
      new Date("2026-09-29T00:00:00Z"),
      90
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ providerId: provider.id, kind: "invalid_date" }),
        expect.objectContaining({ providerId: provider.id, kind: "contradictory_verified_copy" })
      ])
    );
  });

  it("keeps the public schema aligned with credential-free runtime URLs and real dates", () => {
    expect(providerSchema.$defs.httpsUrl.not.pattern).toBe("^https://[^/]*@");
    expect(providerSchema.$defs.httpsUrl.pattern).toBe("^https://");
    expect(providerSchema.properties.updatedAt.format).toBe("date");
    expect(providerSchema.$defs.provider.properties.lastVerifiedAt.format).toBe("date");
  });
});
