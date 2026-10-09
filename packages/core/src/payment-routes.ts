import { z } from "zod";
import routeDatabase from "./data/payment-routes.json";
import { resolveCountryQuery } from "./countries.js";
import { filterProviders, type PaymentProvider, type ProviderCategory } from "./providers.js";
import type { LightningNetwork } from "./invoice.js";

export interface PaymentRouteLimits {
  readonly minimumSats?: string | undefined;
  readonly maximumSats?: string | undefined;
  readonly minimumExclusive?: boolean | undefined;
  readonly checkedAt: string;
  readonly sourceUrl: string;
}

export interface PaymentRoute {
  readonly id: string;
  readonly providerId: string;
  readonly assetSymbol: string;
  readonly assetName: string;
  readonly network: string;
  readonly aliases: readonly string[];
  readonly evidence: readonly { readonly url: string; readonly claim: string; readonly checkedAt: string }[];
  readonly lastVerifiedAt: string;
  readonly limits?: PaymentRouteLimits | undefined;
  readonly refundNote?: string | undefined;
  readonly notes?: string | undefined;
}

export interface PaymentRouteDatabase {
  readonly schemaVersion: 1;
  readonly updatedAt: string;
  readonly routes: readonly PaymentRoute[];
}

const text = (max: number) => z.string().min(1).max(max).refine(
  // eslint-disable-next-line no-control-regex -- Explicitly reject control characters in untrusted metadata.
  (value) => value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value), "Use bounded plain text without control characters."
);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Use a real ISO calendar date.");
const httpsSchema = text(2048).refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}, "Use a credential-free HTTPS URL.");
const satsSchema = z.string().regex(/^[1-9]\d{0,29}$/);
const idSchema = text(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const limitsSchema = z.object({
  minimumSats: satsSchema.optional(), maximumSats: satsSchema.optional(), minimumExclusive: z.boolean().optional(),
  checkedAt: dateSchema, sourceUrl: httpsSchema
}).strict().refine((limits) => !limits.minimumSats || !limits.maximumSats ||
  !/^[1-9]\d{0,29}$/.test(limits.minimumSats) || !/^[1-9]\d{0,29}$/.test(limits.maximumSats) ||
  BigInt(limits.maximumSats) >= BigInt(limits.minimumSats), "Maximum must be at least minimum.");
const routeSchema = z.object({
  id: idSchema, providerId: idSchema, assetSymbol: text(24), assetName: text(80), network: text(80),
  aliases: z.array(text(80)).max(24),
  evidence: z.array(z.object({ url: httpsSchema, claim: text(300), checkedAt: dateSchema }).strict()).min(1).max(24),
  lastVerifiedAt: dateSchema,
  limits: limitsSchema.optional(),
  refundNote: text(600).optional(), notes: text(600).optional()
}).strict();
const databaseSchema = z.object({ schemaVersion: z.literal(1), updatedAt: dateSchema, routes: z.array(routeSchema).max(10000) }).strict()
  .refine((database) => new Set(database.routes.map(({ id }) => id)).size === database.routes.length, "Route IDs must be unique.");

/** Validate untrusted host or registry metadata. Throws on invalid input. */
export function parsePaymentRoute(input: unknown): PaymentRoute {
  return routeSchema.parse(input);
}

/** Validate the entire canonical database; no invalid records are silently discarded. */
export function parsePaymentRouteDatabase(input: unknown): PaymentRouteDatabase {
  return databaseSchema.parse(input);
}

const parsedRouteDatabase = parsePaymentRouteDatabase(routeDatabase);
export const defaultPaymentRoutes: readonly PaymentRoute[] = Object.freeze([...parsedRouteDatabase.routes]);
export const paymentRouteDatabaseInfo = Object.freeze({
  schemaVersion: parsedRouteDatabase.schemaVersion, updatedAt: parsedRouteDatabase.updatedAt
});

function normalizeQuery(query: unknown): string {
  // eslint-disable-next-line no-control-regex -- Search must reject ASCII controls, not silently normalize them.
  if (typeof query !== "string" || query.length > 240 || /[\u0000-\u001f\u007f]/.test(query)) return "";
  return query.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

function validRoutes(routes: readonly PaymentRoute[]): PaymentRoute[] {
  if (!Array.isArray(routes) || routes.length > 10000) return [];
  const parsedRoutes = routes.flatMap((route) => {
    const parsed = routeSchema.safeParse(route);
    return parsed.success ? [parsed.data] : [];
  });
  const counts = new Map<string, number>();
  for (const { id } of parsedRoutes) counts.set(id, (counts.get(id) ?? 0) + 1);
  return parsedRoutes.filter(({ id }) => counts.get(id) === 1);
}

/** Exact recognized asset/alias, optionally paired with its explicit network; never substring search.
 * Network-only terms (e.g. Spark) must be curated as route aliases. Country queries retain precedence.
 */
export function resolveAssetQuery(query: string, routes: readonly PaymentRoute[]): PaymentRoute[] {
  const normalized = normalizeQuery(query);
  if (!normalized || resolveCountryQuery(normalized)) return [];
  return validRoutes(routes).filter((route) => {
    const network = normalizeQuery(route.network);
    return [route.assetSymbol, route.assetName, ...route.aliases].some((term) => {
      const asset = normalizeQuery(term);
      return normalized === asset || normalized === `${asset} ${network}` ||
        normalized === `${asset} on ${network}` || normalized === `${network} ${asset}`;
    });
  });
}

export function isAssetQuery(query: string, routes: readonly PaymentRoute[]): boolean {
  return resolveAssetQuery(query, routes).length > 0;
}

export type PaymentRouteEligibility = "within_limits" | "below_minimum" | "above_maximum" |
  "limits_unknown" | "amount_unknown" | "unsupported_network" | "fractional_satoshi";
export interface PaymentRouteView {
  readonly route: PaymentRoute;
  readonly provider: PaymentProvider;
  readonly eligibility: PaymentRouteEligibility;
  readonly reason: string;
}
export interface DiscoverPaymentRoutesOptions {
  readonly query: string;
  readonly amountMsat: bigint | null;
  readonly invoiceNetwork: LightningNetwork;
  /** Unix epoch seconds, consistent with parseInvoiceMetadata. Defaults to Date.now()/1000 at call time. */
  readonly now?: number;
  readonly category?: ProviderCategory | "all";
}

function eligibility(route: PaymentRoute, options: DiscoverPaymentRoutesOptions, now: number): Pick<PaymentRouteView, "eligibility" | "reason"> {
  if (options.invoiceNetwork !== "bitcoin") return { eligibility: "unsupported_network", reason: "This route supports Bitcoin mainnet Lightning invoices only." };
  const amount = options.amountMsat;
  if (typeof amount !== "bigint" || amount <= 0n) return { eligibility: "amount_unknown", reason: "A positive fixed invoice amount is required to check limits." };
  if (amount % 1000n !== 0n) return { eligibility: "fractional_satoshi", reason: "This route requires whole satoshis; fractional invoice amounts are never rounded." };
  if (!route.limits) return { eligibility: "limits_unknown", reason: "Published invoice limits are unknown; confirm with the provider." };
  const age = now - Date.parse(`${route.limits.checkedAt}T00:00:00Z`) / 1000;
  if (age < 0 || age > 30 * 24 * 60 * 60) return { eligibility: "limits_unknown", reason: "Published limits are stale or future-dated; confirm with the provider." };
  if (route.limits.maximumSats && amount > BigInt(route.limits.maximumSats) * 1000n) return { eligibility: "above_maximum", reason: "Invoice exceeds the published maximum." };
  if (!route.limits.minimumSats) return { eligibility: "limits_unknown", reason: "Published minimum is unknown; confirm with the provider." };
  const minimum = BigInt(route.limits.minimumSats) * 1000n;
  if (amount < minimum || (route.limits.minimumExclusive && amount === minimum)) return { eligibility: "below_minimum", reason: "Invoice does not meet the published minimum." };
  return { eligibility: "within_limits", reason: route.limits.maximumSats
    ? "Within published limits; provider confirms the final quote."
    : "Meets the published minimum; maximum is unknown. Provider confirms the final quote." };
}

function hasFutureEvidence(record: Pick<PaymentRoute, "lastVerifiedAt" | "evidence">, now: number): boolean {
  return [record.lastVerifiedAt, ...record.evidence.map(({ checkedAt }) => checkedAt)]
    .some((date) => Date.parse(`${date}T00:00:00Z`) / 1000 > now);
}

function compareText(a: string, b: string): number {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  return left < right ? -1 : left > right ? 1 : 0;
}
function compareViews(left: PaymentRouteView, right: PaymentRouteView): number {
  const priority = (status: PaymentRouteEligibility) => status === "within_limits" ? 0 :
    status === "limits_unknown" || status === "amount_unknown" ? 1 : 2;
  return priority(left.eligibility) - priority(right.eligibility) || compareText(left.provider.name, right.provider.name) ||
    compareText(left.route.network, right.route.network) || compareText(left.route.assetSymbol, right.route.assetSymbol) ||
    compareText(left.provider.id, right.provider.id) || compareText(left.route.id, right.route.id);
}

/** Pure local discovery, not a quote or payment guarantee. No API calls, wallet connections or swaps. */
export function discoverPaymentRoutes(
  providers: readonly PaymentProvider[], routes: readonly PaymentRoute[], options: DiscoverPaymentRoutesOptions
): PaymentRouteView[] {
  const now = options.now ?? Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(now) || now < 0) return [];
  const visible = new Map(filterProviders(providers, { category: options.category ?? "all" }).map((provider) => [provider.id, provider]));
  return resolveAssetQuery(options.query, routes).flatMap((route) => {
    if (hasFutureEvidence(route, now)) return [];
    const provider = visible.get(route.providerId);
    return provider && !hasFutureEvidence(provider, now) ? [{ route, provider, ...eligibility(route, options, now) }] : [];
  }).sort(compareViews);
}
