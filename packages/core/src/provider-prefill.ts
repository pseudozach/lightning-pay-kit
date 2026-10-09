import { applyAffiliateOverrides, filterProviders, type AffiliateOverrides } from "./providers.js";
import { parseInvoiceMetadata } from "./invoice.js";
import { defaultPaymentRoutes, discoverPaymentRoutes, type PaymentRouteView } from "./payment-routes.js";

export interface PaymentRouteHandoff {
  readonly url: string;
  readonly invoicePrefilled: boolean;
}
const satoraChains: Readonly<Record<string, string>> = { Ethereum: "1", Polygon: "137", Arbitrum: "42161", Rootstock: "30" };
export interface PaymentRouteHandoffOptions {
  readonly now?: number;
  readonly affiliateOverrides?: AffiliateOverrides;
}

/** Pure, link-only handoff. Never connects a wallet, creates an order or submits a payment. */
export function createPaymentRouteHandoff(view: PaymentRouteView, invoice: string, options: PaymentRouteHandoffOptions = {}): PaymentRouteHandoff {
  const safeProvider = filterProviders([view.provider], {})[0];
  const destination = safeProvider ? applyAffiliateOverrides([safeProvider], options.affiliateOverrides)[0]?.destinationUrl : undefined;
  const fallback = { url: destination ?? "https://pseudozach.github.io/lightning-pay-kit/", invoicePrefilled: false };
  if (!safeProvider || !destination) return fallback;
  const affiliateUrl = new URL(destination);
  // Full URL overrides retain their original meaning. Only canonical FixedFloat
  // destinations have a verified referral + invoice-prefill composition contract.
  if (view.provider.id === "fixedfloat") {
    if (affiliateUrl.origin !== "https://ff.io" || affiliateUrl.pathname !== "/") return fallback;
  } else if (destination !== safeProvider.action.url) return fallback;
  const metadata = parseInvoiceMetadata(invoice, options);
  if (!metadata.ok || metadata.expired || metadata.network !== "bitcoin" || metadata.amountMsat === null || metadata.amountMsat <= 0n || metadata.amountMsat % 1000n !== 0n) return fallback;
  // Do not trust a caller-supplied eligibility label; reevaluate the actual invoice.
  const checked = discoverPaymentRoutes([view.provider], [view.route], { query: view.route.assetSymbol, amountMsat: metadata.amountMsat, invoiceNetwork: metadata.network, ...options })[0];
  if (!checked || !["within_limits", "limits_unknown"].includes(checked.eligibility)) return fallback;
  // Only reviewed canonical source asset/network combinations get a prefill contract.
  const canonical = defaultPaymentRoutes.find(route => route.id === view.route.id && route.providerId === view.provider.id && route.assetSymbol === view.route.assetSymbol && route.network === view.route.network);
  if (!canonical) return fallback;
  let url: URL;
  if (view.provider.id === "satora") {
    const chain = satoraChains[canonical.network];
    if (!chain || !/^[A-Za-z0-9]{1,24}$/.test(canonical.assetSymbol)) return fallback;
    url = new URL(`https://app.satora.io/${chain}:${canonical.assetSymbol}/lightning:BTC`);
    url.searchParams.set("targetAmount", (metadata.amountMsat / 1000n).toString());
    url.searchParams.set("address", metadata.invoice);
  } else if (view.provider.id === "fixedfloat") {
    const code = canonical.id.slice("fixedfloat-".length).toUpperCase();
    if (!/^[A-Z0-9]{2,24}$/.test(code)) return fallback;
    const sats = metadata.amountMsat / 1000n;
    const fraction = (sats % 100000000n).toString().padStart(8, "0").replace(/0+$/, "");
    const btc = (sats / 100000000n).toString() + (fraction ? `.${fraction}` : "");
    url = new URL("https://ff.io/");
    // Copy only the verified referral parameter, never host-supplied payment fields.
    const ref = affiliateUrl.searchParams.get("ref");
    if (ref !== null) url.searchParams.set("ref", ref);
    url.searchParams.set("from", code);
    url.searchParams.set("to", "BTCLN");
    url.searchParams.set("toAmount", btc);
    url.searchParams.set("address", metadata.invoice);
    url.searchParams.set("type", "fixed");
  } else return fallback;
  if (url.href.length > 8192) return fallback;
  return { url: url.href, invoicePrefilled: true };
}
