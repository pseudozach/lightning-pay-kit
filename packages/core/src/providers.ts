import { z } from "zod";

export type ProviderCategory = "wallet" | "payment_app" | "exchange" | "swap";
export type ProviderCustody = "custodial" | "self_custodial" | "configurable" | "swap_based";
export type ProviderPlatform = "ios" | "android" | "web" | "desktop" | "extension";
export type ProviderServiceStatus = "active" | "maintenance" | "suspended" | "retired" | "unknown";
export type ProviderVerificationStatus = "verified" | "needs_reverification" | "unverified";

export interface PaymentProvider {
  readonly id: string;
  readonly name: string;
  readonly aliases: readonly string[];
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

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use an ISO date (YYYY-MM-DD).");
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

const provider = (record: PaymentProvider): PaymentProvider => providerSchema.parse(record);
const checkedAt = "2026-09-28";

function record(
  input: Omit<PaymentProvider, "lastVerifiedAt" | "evidence"> & {
    evidenceUrl: string;
    evidenceClaim: string;
  }
): PaymentProvider {
  const { evidenceClaim, evidenceUrl, ...rest } = input;
  return provider({
    ...rest,
    lastVerifiedAt: checkedAt,
    evidence: [{ url: evidenceUrl, claim: evidenceClaim, checkedAt }]
  });
}

const records: PaymentProvider[] = [
  record({ id: "alby", name: "Alby", aliases: ["Alby Go", "Alby Hub"], category: "wallet", custody: "configurable", platforms: ["android", "ios", "web", "extension"], regions: { notes: "Backend and availability depend on the user's setup." }, action: { type: "copy_then_open", url: "https://getalby.com/", label: "Copy invoice, then open Alby's website" }, serviceStatus: "active", verificationStatus: "verified", accountRequired: false, kycRequired: false, evidenceUrl: "https://getalby.com/", evidenceClaim: "Alby documents its Lightning wallet ecosystem." }),
  record({ id: "aqua", name: "AQUA", aliases: ["Aqua Wallet"], category: "wallet", custody: "swap_based", platforms: ["android", "ios"], regions: { notes: "Fixed-amount Lightning invoices use swaps; amountless support is limited." }, action: { type: "copy_then_open", url: "https://aquawallet.io/", label: "Copy invoice, then open AQUA's website" }, serviceStatus: "active", verificationStatus: "verified", accountRequired: false, kycRequired: false, evidenceUrl: "https://github.com/AquaWallet/aqua-wallet", evidenceClaim: "First-party source implements Lightning invoice payment through swaps." }),
  record({ id: "belo", name: "belo", aliases: [], category: "payment_app", custody: "custodial", platforms: ["android", "ios"], regions: { notes: "Account and regional availability apply." }, action: { type: "copy_then_open", url: "https://help.belo.app/en/articles/5899323-how-to-withdraw-btc-from-belo-via-the-lightning-network", label: "Copy invoice, then open belo's Lightning instructions" }, serviceStatus: "active", verificationStatus: "verified", accountRequired: true, kycRequired: true, evidenceUrl: "https://help.belo.app/en/articles/5899323-how-to-withdraw-btc-from-belo-via-the-lightning-network", evidenceClaim: "First-party help says to paste a Lightning invoice for withdrawal." }),
  record({ id: "binance", name: "Binance", aliases: [], category: "exchange", custody: "custodial", platforms: ["android", "ios", "web"], regions: { notes: "Needs a final current manual capability review." }, action: { type: "copy_then_open", url: "https://www.binance.com/en/support/faq/how-to-deposit-and-withdraw-bitcoin-lightning-network-on-binance-7ca9f06590d54bd6a89d8a56c8d77641", label: "Copy invoice, then open Binance's Lightning instructions" }, serviceStatus: "unknown", verificationStatus: "needs_reverification", accountRequired: true, kycRequired: true, evidenceUrl: "https://www.binance.com/en/support/faq/how-to-deposit-and-withdraw-bitcoin-lightning-network-on-binance-7ca9f06590d54bd6a89d8a56c8d77641", evidenceClaim: "First-party support URL exists but capability could not be reverified in the research environment." }),
  record({ id: "blink", name: "Blink", aliases: ["Blink Bitcoin"], category: "wallet", custody: "custodial", platforms: ["android", "ios", "web"], regions: { notes: "Availability varies by region." }, action: { type: "copy_then_open", url: "https://www.blink.sv/", label: "Copy invoice, then open Blink's website" }, serviceStatus: "active", verificationStatus: "verified", accountRequired: true, kycRequired: false, evidenceUrl: "https://github.com/BlinkBitcoin/blink-mobile", evidenceClaim: "First-party source implements BOLT11 payment." }),
  record({ id: "blixt", name: "Blixt Wallet", aliases: ["Blixt"], category: "wallet", custody: "self_custodial", platforms: ["android", "ios"], regions: {}, action: { type: "copy_then_open", url: "https://blixtwallet.github.io/", label: "Copy invoice, then open Blixt's website" }, serviceStatus: "active", verificationStatus: "verified", accountRequired: false, kycRequired: false, evidenceUrl: "https://github.com/BlixtWallet/blixt-wallet", evidenceClaim: "First-party source provides an embedded-LND Lightning wallet." }),
  record({ id: "blockstream-app", name: "Blockstream App", aliases: ["Green"], category: "wallet", custody: "self_custodial", platforms: ["android", "ios", "desktop"], regions: {}, action: { type: "copy_then_open", url: "https://blockstream.com/app/", label: "Copy invoice, then open Blockstream App's website" }, serviceStatus: "active", verificationStatus: "verified", accountRequired: false, kycRequired: false, evidenceUrl: "https://blockstream.com/app/", evidenceClaim: "First-party product page documents Lightning send flows." }),
  record({ id: "bluewallet", name: "BlueWallet", aliases: ["Blue Wallet"], category: "wallet", custody: "configurable", platforms: ["android", "ios"], regions: { notes: "Lightning support depends on the user's configured backend." }, action: { type: "copy_then_open", url: "https://bluewallet.io/", label: "Copy invoice, then open BlueWallet's website" }, serviceStatus: "active", verificationStatus: "verified", accountRequired: false, kycRequired: false, evidenceUrl: "https://github.com/BlueWallet/BlueWallet", evidenceClaim: "First-party source contains BOLT11 payment flows." }),
  record({ id: "boltz", name: "Boltz", aliases: ["Boltz Exchange"], category: "swap", custody: "swap_based", platforms: ["web"], regions: {}, action: { type: "copy_then_open", url: "https://boltz.exchange/", label: "Service suspended" }, serviceStatus: "suspended", verificationStatus: "verified", accountRequired: false, kycRequired: false, evidenceUrl: "https://github.com/BoltzExchange/boltz-web-app/blob/master/src/configs/mainnet.ts", evidenceClaim: "First-party production configuration reports swaps suspended." }),
  record({ id: "breez", name: "Breez Mobile", aliases: ["Breez"], category: "wallet", custody: "self_custodial", platforms: ["android", "ios"], regions: { notes: "The original app is in maintenance mode." }, action: { type: "copy_then_open", url: "https://github.com/breez/breezmobile", label: "Copy invoice, then view Breez Mobile's maintenance notice" }, serviceStatus: "maintenance", verificationStatus: "verified", accountRequired: false, kycRequired: false, evidenceUrl: "https://github.com/breez/breezmobile", evidenceClaim: "First-party repository identifies the original mobile app as maintenance-only." }),
  record({ id: "cash-app", name: "Cash App", aliases: ["CashApp"], category: "payment_app", custody: "custodial", platforms: ["android", "ios"], regions: { include: ["US"], notes: "Lightning receive availability and limits vary, including New York restrictions." }, action: { type: "copy_then_open", url: "https://cash.app/help/us/en-us/6506-bitcoin-lightning", label: "Copy invoice, then open Cash App's Lightning instructions" }, serviceStatus: "active", verificationStatus: "verified", accountRequired: true, kycRequired: true, evidenceUrl: "https://cash.app/help/us/en-us/6506-bitcoin-lightning", evidenceClaim: "First-party help documents paying a Lightning invoice by scan." }),
  record({ id: "coinbase", name: "Coinbase", aliases: [], category: "exchange", custody: "custodial", platforms: ["android", "ios", "web"], regions: { notes: "Needs a final current manual capability review." }, action: { type: "copy_then_open", url: "https://help.coinbase.com/en/coinbase/trading-and-funding/sending-or-receiving-cryptocurrency/lightning", label: "Copy invoice, then open Coinbase's Lightning instructions" }, serviceStatus: "unknown", verificationStatus: "needs_reverification", accountRequired: true, kycRequired: true, evidenceUrl: "https://help.coinbase.com/en/coinbase/trading-and-funding/sending-or-receiving-cryptocurrency/lightning", evidenceClaim: "First-party help URL exists but capability could not be reverified in the research environment." }),
  record({ id: "fixedfloat", name: "FixedFloat", aliases: ["Fixed Float"], category: "swap", custody: "swap_based", platforms: ["web"], regions: { notes: "An arbitrary-BOLT11 route has not been reverified." }, action: { type: "copy_then_open", url: "https://fixedfloat.com/", label: "Copy invoice, then open FixedFloat's website" }, serviceStatus: "unknown", verificationStatus: "needs_reverification", accountRequired: false, kycRequired: false, evidenceUrl: "https://fixedfloat.com/", evidenceClaim: "Service site is current, but arbitrary-BOLT11 destination support still needs manual verification." }),
  record({ id: "kraken", name: "Kraken", aliases: [], category: "exchange", custody: "custodial", platforms: ["android", "ios", "web"], regions: { notes: "Account, limits, and regional availability apply." }, action: { type: "copy_then_open", url: "https://support.kraken.com/articles/5068216131988-how-do-i-send-bitcoin-on-the-lightning-network-", label: "Copy invoice, then open Kraken's Lightning withdrawal instructions" }, serviceStatus: "active", verificationStatus: "verified", accountRequired: true, kycRequired: true, evidenceUrl: "https://support.kraken.com/articles/5068216131988-how-do-i-send-bitcoin-on-the-lightning-network-", evidenceClaim: "First-party help documents amount-specific Lightning invoice withdrawals." }),
  record({ id: "muun", name: "Muun", aliases: [], category: "wallet", custody: "self_custodial", platforms: ["android", "ios"], regions: {}, action: { type: "copy_then_open", url: "https://muun.com/", label: "Copy invoice, then open Muun's website" }, serviceStatus: "active", verificationStatus: "verified", accountRequired: false, kycRequired: false, evidenceUrl: "https://github.com/muun/apollo", evidenceClaim: "First-party source parses and pays BOLT11 invoices." }),
  record({ id: "ndax", name: "Ndax", aliases: [], category: "exchange", custody: "custodial", platforms: ["android", "ios", "web"], regions: { include: ["CA"], notes: "Canadian account and limits apply." }, action: { type: "copy_then_open", url: "https://ndax.io/en/blog/article/move-bitcoin-faster-with-btc-lightning-on-ndax", label: "Copy invoice, then open Ndax's Lightning withdrawal instructions" }, serviceStatus: "active", verificationStatus: "verified", accountRequired: true, kycRequired: true, evidenceUrl: "https://ndax.io/en/blog/article/move-bitcoin-faster-with-btc-lightning-on-ndax", evidenceClaim: "First-party announcement documents invoice-based Lightning withdrawals." }),
  record({ id: "okx", name: "OKX", aliases: [], category: "exchange", custody: "custodial", platforms: ["android", "ios", "web"], regions: { notes: "Account and regional availability apply." }, action: { type: "copy_then_open", url: "https://www.okx.com/en-us/help/how-do-i-withdraw-bitcoin-btc-with-okx-lightning-network", label: "Copy invoice, then open OKX's Lightning withdrawal instructions" }, serviceStatus: "active", verificationStatus: "verified", accountRequired: true, kycRequired: true, evidenceUrl: "https://www.okx.com/en-us/help/how-do-i-withdraw-bitcoin-btc-with-okx-lightning-network", evidenceClaim: "First-party help says to paste a Lightning invoice for withdrawal." }),
  record({ id: "phoenix", name: "Phoenix", aliases: ["ACINQ", "self custody"], category: "wallet", custody: "self_custodial", platforms: ["android", "ios"], regions: {}, action: { type: "copy_then_open", url: "https://phoenix.acinq.co/", label: "Copy invoice, then open Phoenix's website" }, serviceStatus: "active", verificationStatus: "verified", accountRequired: false, kycRequired: false, evidenceUrl: "https://github.com/ACINQ/phoenix", evidenceClaim: "First-party source implements BOLT11 payment." }),
  record({ id: "shakepay", name: "Shakepay", aliases: [], category: "payment_app", custody: "custodial", platforms: ["android", "ios"], regions: { include: ["CA"], notes: "Canadian account and limits apply." }, action: { type: "copy_then_open", url: "https://help.shakepay.com/en/articles/12334301-how-to-receive-or-withdraw-bitcoin-on-the-lightning-network", label: "Copy invoice, then open Shakepay's Lightning withdrawal instructions" }, serviceStatus: "active", verificationStatus: "verified", accountRequired: true, kycRequired: true, evidenceUrl: "https://help.shakepay.com/en/articles/12334301-how-to-receive-or-withdraw-bitcoin-on-the-lightning-network", evidenceClaim: "First-party help says to paste a Lightning invoice before sending." }),
  record({ id: "speed", name: "Speed Wallet", aliases: ["Speed"], category: "wallet", custody: "custodial", platforms: ["android", "ios", "web"], regions: {}, action: { type: "copy_then_open", url: "https://www.speed.app/send-and-receive", label: "Copy invoice, then open Speed Wallet's payment instructions" }, serviceStatus: "active", verificationStatus: "verified", accountRequired: true, kycRequired: false, evidenceUrl: "https://www.speed.app/send-and-receive", evidenceClaim: "First-party site documents Lightning wallet payments." }),
  record({ id: "strike", name: "Strike", aliases: [], category: "payment_app", custody: "custodial", platforms: ["android", "ios"], regions: { notes: "Account and regional availability apply." }, action: { type: "copy_then_open", url: "https://strike.me/support/how-do-i-send-cash-or-bitcoin/", label: "Copy invoice, then open Strike's payment instructions" }, serviceStatus: "active", verificationStatus: "verified", accountRequired: true, kycRequired: true, evidenceUrl: "https://strike.me/support/how-do-i-send-cash-or-bitcoin/", evidenceClaim: "First-party support states Strike accepts BOLT11 invoices." }),
  record({ id: "wallet-of-satoshi", name: "Wallet of Satoshi", aliases: ["WoS"], category: "wallet", custody: "custodial", platforms: ["android", "ios"], regions: { notes: "Availability and operating mode vary by region." }, action: { type: "copy_then_open", url: "https://www.walletofsatoshi.com/", label: "Copy invoice, then open Wallet of Satoshi's website" }, serviceStatus: "active", verificationStatus: "verified", accountRequired: false, kycRequired: false, evidenceUrl: "https://www.walletofsatoshi.com/", evidenceClaim: "First-party FAQ documents scanned and pasted Lightning invoice payments." }),
  record({ id: "zeus", name: "ZEUS", aliases: ["Zeus LN"], category: "wallet", custody: "configurable", platforms: ["android", "ios"], regions: {}, action: { type: "copy_then_open", url: "https://zeusln.com/", label: "Copy invoice, then open ZEUS's website" }, serviceStatus: "active", verificationStatus: "verified", accountRequired: false, kycRequired: false, evidenceUrl: "https://github.com/ZeusLN/zeus", evidenceClaim: "First-party source implements invoice payment." })
];

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
