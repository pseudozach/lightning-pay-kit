import { z } from "zod";
import providerDatabase from "./data/providers.json";

export type ProviderCategory = "wallet" | "payment_app" | "exchange" | "swap";
export type ProviderCustody = "custodial" | "self_custodial" | "configurable" | "swap_based";
export type ProviderPlatform = "ios" | "android" | "web" | "desktop" | "extension";
export type ProviderServiceStatus = "active" | "maintenance" | "suspended" | "retired" | "unknown";
export type ProviderVerificationStatus = "verified" | "needs_reverification" | "unverified";
export type ProviderLightningMode =
  | "custodial"
  | "embedded_node"
  | "exchange_withdrawal"
  | "historical"
  | "hosted_node"
  | "native_lightning"
  | "remote_node"
  | "spark"
  | "swap"
  | "unknown";

export interface PaymentProvider {
  readonly id: string;
  readonly name: string;
  readonly aliases: readonly string[];
  /** Plain-language explanation of how this provider can pay a Lightning invoice. */
  readonly capabilitySummary?: string | undefined;
  /** Machine-readable payment mechanisms used by the provider. */
  readonly lightningModes?: readonly ProviderLightningMode[] | undefined;
  readonly category: ProviderCategory;
  readonly custody: ProviderCustody;
  readonly platforms: readonly ProviderPlatform[];
  readonly regions: {
    readonly include?: readonly string[] | undefined;
    readonly exclude?: readonly string[] | undefined;
    readonly notes?: string | undefined;
  };
  readonly action: {
    readonly type: "copy_then_open";
    readonly url: string;
    readonly label: string;
  };
  readonly serviceStatus: ProviderServiceStatus;
  readonly verificationStatus: ProviderVerificationStatus;
  readonly lastVerifiedAt: string;
  readonly evidence: readonly {
    readonly url: string;
    readonly claim: string;
    readonly checkedAt: string;
  }[];
  readonly accountRequired: boolean;
  readonly kycRequired: boolean;
}

export interface ProviderFilter {
  readonly query?: string;
  readonly category?: ProviderCategory | "all";
  readonly includeUnavailable?: boolean;
}

export interface AffiliateOverride {
  readonly url: string;
  readonly disclosure: string;
}

export type AffiliateOverrides = Readonly<Record<string, AffiliateOverride>>;

export interface ProviderView extends PaymentProvider {
  readonly destinationUrl: string;
  readonly affiliateDisclosure?: string;
}

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use an ISO date (YYYY-MM-DD).")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Use a real calendar date.");
const lightningModeSchema = z.enum([
  "custodial",
  "embedded_node",
  "exchange_withdrawal",
  "historical",
  "hosted_node",
  "native_lightning",
  "remote_node",
  "spark",
  "swap",
  "unknown"
]);
const httpsUrlSchema = z.string().superRefine((value, context) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) {
      context.addIssue({ code: "custom", message: "Only credential-free HTTPS URLs are allowed." });
    }
  } catch {
    context.addIssue({ code: "custom", message: "Enter a valid HTTPS URL." });
  }
});

const providerSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().trim().min(1).max(80),
    aliases: z.array(z.string().trim().min(1).max(40)).max(12),
    capabilitySummary: z.string().trim().min(45).max(160).optional(),
    lightningModes: z.array(lightningModeSchema).min(1).max(4).optional(),
    category: z.enum(["wallet", "payment_app", "exchange", "swap"]),
    custody: z.enum(["custodial", "self_custodial", "configurable", "swap_based"]),
    platforms: z.array(z.enum(["ios", "android", "web", "desktop", "extension"])).min(1),
    regions: z
      .object({
        include: z.array(z.string().regex(/^[A-Z]{2}$/)).optional(),
        exclude: z.array(z.string().regex(/^[A-Z]{2}$/)).optional(),
        notes: z.string().trim().min(1).max(240).optional()
      })
      .strict(),
    action: z
      .object({
        type: z.literal("copy_then_open"),
        url: httpsUrlSchema,
        label: z.string().trim().min(1).max(140)
      })
      .strict(),
    serviceStatus: z.enum(["active", "maintenance", "suspended", "retired", "unknown"]),
    verificationStatus: z.enum(["verified", "needs_reverification", "unverified"]),
    lastVerifiedAt: dateSchema,
    evidence: z
      .array(
        z
          .object({
            url: httpsUrlSchema,
            claim: z.string().trim().min(1).max(300),
            checkedAt: dateSchema
          })
          .strict()
      )
      .min(1),
    accountRequired: z.boolean(),
    kycRequired: z.boolean()
  })
  .strict();

const canonicalProviderSchema = providerSchema.extend({
  capabilitySummary: z.string().trim().min(45).max(160),
  lightningModes: z.array(lightningModeSchema).min(1).max(4)
});
const directorySourceSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    url: httpsUrlSchema,
    lastCheckedAt: dateSchema,
    sourceLastUpdatedAt: dateSchema.optional(),
    role: z.string().trim().min(1).max(240),
    limitations: z.string().trim().min(1).max(500)
  })
  .strict();
const providerDatabaseSchema = z
  .object({
    $schema: z.literal("./providers.schema.json"),
    schemaVersion: z.literal(1),
    updatedAt: dateSchema,
    directorySources: z.array(directorySourceSchema).min(1),
    providers: z.array(canonicalProviderSchema).min(1)
  })
  .strict();
const parsedProviderDatabase = providerDatabaseSchema.parse(providerDatabase);
const records: PaymentProvider[] = parsedProviderDatabase.providers;

export const providerDatabaseInfo = Object.freeze({
  schemaVersion: parsedProviderDatabase.schemaVersion,
  updatedAt: parsedProviderDatabase.updatedAt,
  directorySources: Object.freeze(parsedProviderDatabase.directorySources)
});

function compareProviderNames(left: PaymentProvider, right: PaymentProvider): number {
  const a = left.name.toLowerCase();
  const b = right.name.toLowerCase();
  return a < b ? -1 : a > b ? 1 : left.id < right.id ? -1 : 1;
}

export const defaultProviders: readonly PaymentProvider[] = Object.freeze(
  [...records].sort(compareProviderNames)
);

export function filterProviders(
  providers: readonly PaymentProvider[],
  filter: ProviderFilter
): PaymentProvider[] {
  const query = filter.query?.trim().toLowerCase() ?? "";
  const validatedProviders = providers.flatMap((item) => {
    const parsed = providerSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
  return validatedProviders
    .filter((item) => {
      if (!filter.includeUnavailable) {
        if (item.verificationStatus !== "verified") return false;
        if (!["active", "maintenance"].includes(item.serviceStatus)) return false;
      }
      if (filter.category && filter.category !== "all" && item.category !== filter.category) {
        return false;
      }
      if (query.length > 0) {
        const searchable = [
          item.name,
          ...item.aliases,
          item.capabilitySummary ?? "",
          ...(item.lightningModes ?? []).map((mode) => mode.replace("_", " ")),
          item.category.replace("_", " "),
          item.custody.replace("_", " "),
          ...item.platforms
        ]
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(query)) return false;
      }
      return true;
    })
    .sort(compareProviderNames);
}

const affiliateOverrideSchema = z
  .object({
    url: httpsUrlSchema,
    disclosure: z.string().trim().min(1).max(100)
  })
  .strict();

export function applyAffiliateOverrides(
  providers: readonly PaymentProvider[],
  overrides: AffiliateOverrides = {}
): ProviderView[] {
  return providers.map((item) => {
    const override = overrides[item.id];
    if (!override) return { ...item, destinationUrl: item.action.url };
    const safeOverride = affiliateOverrideSchema.parse(override);
    return {
      ...item,
      destinationUrl: safeOverride.url,
      affiliateDisclosure: safeOverride.disclosure
    };
  });
}
