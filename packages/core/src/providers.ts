import { z } from "zod";
import { countryFlag, countryName, isIsoCountryCode, resolveCountryQuery } from "./countries.js";
import providerDatabase from "./data/providers.json";

export type ProviderCategory = "wallet" | "payment_app" | "exchange" | "swap";
export type ProviderCustody = "custodial" | "self_custodial" | "configurable" | "swap_based";
export type ProviderPlatform = "ios" | "android" | "web" | "desktop" | "extension";
export type ProviderRegionScope =
  | "global"
  | "country_specific"
  | "global_with_exclusions"
  | "unknown";
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
    readonly scope?: ProviderRegionScope | undefined;
    readonly include?: readonly string[] | undefined;
    readonly exclude?: readonly string[] | undefined;
    readonly label?: string | undefined;
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

export type AffiliateOverrides = Readonly<Record<string, AffiliateOverride | null>>;

export interface ProviderView extends PaymentProvider {
  readonly destinationUrl: string;
  readonly affiliateDisclosure?: string;
}

export interface ProviderRegionPresentation {
  readonly flags: string;
  readonly label: string;
}

export const defaultAffiliateOverrides: AffiliateOverrides = Object.freeze({
  fixedfloat: Object.freeze({
    url: "https://ff.io/?ref=pmdxabka",
    disclosure: "Affiliate"
  })
});

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

const countryCodesSchema = z
  .array(z.string().refine(isIsoCountryCode, "Use a maintained ISO 3166-1 alpha-2 country code."))
  .min(1)
  .max(250)
  .refine((codes) => new Set(codes).size === codes.length, "Country codes must be unique.");

const regionsSchema = z
  .object({
    scope: z.enum(["global", "country_specific", "global_with_exclusions", "unknown"]).optional(),
    include: countryCodesSchema.optional(),
    exclude: countryCodesSchema.optional(),
    label: z.string().trim().min(1).max(50).optional(),
    notes: z.string().trim().min(1).max(240).optional()
  })
  .strict()
  .superRefine((regions, context) => {
    const issue = (path: "include" | "exclude", message: string) =>
      context.addIssue({ code: "custom", path: [path], message });
    if (regions.scope === "country_specific") {
      if (!regions.include) issue("include", "Country-specific scope requires a nonempty include list.");
      if (regions.exclude) issue("exclude", "Country-specific scope cannot define exclusions.");
      return;
    }
    if (regions.scope === "global_with_exclusions") {
      if (!regions.exclude) issue("exclude", "Global-with-exclusions scope requires a nonempty exclude list.");
      if (regions.include) issue("include", "Global-with-exclusions scope cannot define an include list.");
      return;
    }
    if (regions.include) issue("include", "Include lists are valid only for country-specific scope.");
    if (regions.exclude) issue("exclude", "Exclusion lists are valid only for global-with-exclusions scope.");
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
    regions: regionsSchema,
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
  const countryCode = resolveCountryQuery(query);
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
      if (countryCode) {
        if (item.regions.include?.length) return item.regions.include.includes(countryCode);
        if (item.regions.scope === "global") return true;
        if (item.regions.scope === "global_with_exclusions") {
          return !item.regions.exclude?.includes(countryCode);
        }
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
    .sort((left, right) => {
      if (countryCode) {
        const leftLocal = left.regions.include?.includes(countryCode) ? 0 : 1;
        const rightLocal = right.regions.include?.includes(countryCode) ? 0 : 1;
        if (leftLocal !== rightLocal) return leftLocal - rightLocal;
      }
      return compareProviderNames(left, right);
    });
}

export function getProviderRegionPresentation(
  provider: PaymentProvider,
  countryQuery = ""
): ProviderRegionPresentation {
  const included = provider.regions.include ?? [];
  if (included.length > 0) {
    const matchedCountry = resolveCountryQuery(countryQuery);
    const displayed = matchedCountry && included.includes(matchedCountry) ? [matchedCountry] : included.slice(0, 3);
    return {
      flags: displayed.map(countryFlag).join(" "),
      label:
        provider.regions.label ??
        (included.length === 1
          ? `${countryName(included[0] ?? "")} only`
          : `${String(included.length)} countries`)
    };
  }
  if (provider.regions.scope === "global") {
    return { flags: "🌍", label: provider.regions.label ?? "Global" };
  }
  if (provider.regions.scope === "global_with_exclusions") {
    return { flags: "🌍", label: provider.regions.label ?? "Most countries" };
  }
  return {
    flags: "◌",
    label: provider.regions.label ?? "Availability varies"
  };
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
    const hasHostOverride = Object.prototype.hasOwnProperty.call(overrides, item.id);
    const bundledDefault =
      item.id === "fixedfloat" && item.action.url === "https://ff.io/"
        ? defaultAffiliateOverrides.fixedfloat
        : undefined;
    const override = hasHostOverride ? overrides[item.id] : bundledDefault;
    if (override === null || override === undefined) {
      return { ...item, destinationUrl: item.action.url };
    }
    const safeOverride = affiliateOverrideSchema.parse(override);
    return {
      ...item,
      destinationUrl: safeOverride.url,
      affiliateDisclosure: safeOverride.disclosure
    };
  });
}
