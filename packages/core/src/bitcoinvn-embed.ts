import { applyAffiliateOverrides, defaultProviders, type AffiliateOverrides } from "./providers.js";

export interface BitcoinVnEmbedOptions {
  readonly affiliateOverrides?: AffiliateOverrides;
}

/**
 * Pure URL construction for BitcoinVN's verified swap iframe. No network, order,
 * wallet or payment side effects; no invoice-prefill contract is assumed.
 * String codes, disclosed URL overrides and null opt-out share the provider-card
 * configuration. Only ref is copied; payment fields are never copied to embeds.
 * A full URL override must use BitcoinVN's origin to compose an embed URL.
 */
export function createBitcoinVnEmbedUrl(options: BitcoinVnEmbedOptions = {}): string {
  const provider = defaultProviders.find(({ id }) => id === "bitcoinvn");
  if (!provider) throw new Error("BitcoinVN provider metadata is unavailable.");
  const destination = applyAffiliateOverrides([provider], options.affiliateOverrides)[0];
  if (!destination) throw new Error("BitcoinVN provider metadata is unavailable.");
  const affiliateUrl = new URL(destination.destinationUrl);
  if (affiliateUrl.origin !== "https://bitcoinvn.io") {
    throw new Error("BitcoinVN embed referral URL must use https://bitcoinvn.io.");
  }
  const url = new URL("https://bitcoinvn.io/embed/swap?settle=btcln");
  const ref = affiliateUrl.searchParams.get("ref");
  if (ref !== null) url.searchParams.set("ref", ref);
  return url.href;
}
