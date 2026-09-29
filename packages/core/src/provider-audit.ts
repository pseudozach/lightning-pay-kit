import type { PaymentProvider } from "./providers.js";

export interface ProviderUrl {
  readonly providerId: string;
  readonly kind: "action" | "evidence";
  readonly url: string;
}

export interface ProviderAuditIssue {
  readonly providerId: string;
  readonly kind:
    | "duplicate_id"
    | "contradictory_verified_copy"
    | "generic_summary"
    | "invalid_date"
    | "stale_evidence"
    | "stale_verification";
  readonly message: string;
}

const genericSummaryPattern = /copy invoice|open .*website|^configurable$/i;
const contradictoryVerifiedPattern =
  /needs? (?:a final )?(?:current )?(?:manual )?(?:capability )?review|needs? reverification|not reverified|unverified|could not be (?:re)?verified/i;
const millisecondsPerDay = 86_400_000;

function isRealIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function collectProviderUrls(providers: readonly PaymentProvider[]): ProviderUrl[] {
  return providers.flatMap((provider) => [
    { providerId: provider.id, kind: "action" as const, url: provider.action.url },
    ...provider.evidence.map(({ url }) => ({
      providerId: provider.id,
      kind: "evidence" as const,
      url
    }))
  ]);
}

export function auditProviderMetadata(
  providers: readonly PaymentProvider[],
  now = new Date(),
  maxAgeDays = 90
): ProviderAuditIssue[] {
  const issues: ProviderAuditIssue[] = [];
  const ids = new Set<string>();
  const staleBefore = now.getTime() - maxAgeDays * millisecondsPerDay;

  for (const provider of providers) {
    if (ids.has(provider.id)) {
      issues.push({
        providerId: provider.id,
        kind: "duplicate_id",
        message: `Duplicate provider ID: ${provider.id}`
      });
    }
    ids.add(provider.id);

    if (!provider.capabilitySummary || genericSummaryPattern.test(provider.capabilitySummary)) {
      issues.push({
        providerId: provider.id,
        kind: "generic_summary",
        message: "Capability summary must explain the Lightning payment mechanism."
      });
    }

    if (!isRealIsoDate(provider.lastVerifiedAt)) {
      issues.push({
        providerId: provider.id,
        kind: "invalid_date",
        message: `Invalid verification date: ${provider.lastVerifiedAt}`
      });
    } else if (Date.parse(`${provider.lastVerifiedAt}T00:00:00Z`) < staleBefore) {
      issues.push({
        providerId: provider.id,
        kind: "stale_verification",
        message: `Provider verification is older than ${String(maxAgeDays)} days.`
      });
    }

    if (
      provider.verificationStatus === "verified" &&
      ["active", "maintenance"].includes(provider.serviceStatus) &&
      contradictoryVerifiedPattern.test(
        [
          provider.capabilitySummary ?? "",
          provider.regions.notes ?? "",
          ...provider.evidence.map(({ claim }) => claim)
        ].join(" ")
      )
    ) {
      issues.push({
        providerId: provider.id,
        kind: "contradictory_verified_copy",
        message: "Visible verified provider metadata still disclaims capability verification."
      });
    }

    for (const evidence of provider.evidence) {
      if (!isRealIsoDate(evidence.checkedAt)) {
        issues.push({
          providerId: provider.id,
          kind: "invalid_date",
          message: `Invalid evidence date: ${evidence.checkedAt}`
        });
      } else if (Date.parse(`${evidence.checkedAt}T00:00:00Z`) < staleBefore) {
        issues.push({
          providerId: provider.id,
          kind: "stale_evidence",
          message: `Evidence is older than ${String(maxAgeDays)} days: ${evidence.url}`
        });
      }
    }
  }

  return issues;
}
