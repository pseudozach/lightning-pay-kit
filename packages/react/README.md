# lightning-pay-kit

Accessible React payment-help UI for BOLT11 Lightning invoices. It provides a
compact `?` or “How can I pay?” trigger and a conservative provider directory
searchable by wallet, app, exchange, or country.

It is **not** a wallet connector or payment processor. A provider-page visit is
only a handoff and never proves payment.

## Install

```bash
npm install lightning-pay-kit
```

React and React DOM 17, 18, and 19 are supported.

Import the stylesheet once, then pass the host-owned invoice:

```tsx
import { LightningPaymentHelp } from "lightning-pay-kit";
import "lightning-pay-kit/styles.css";

export function InvoiceHelp({ invoice }: { invoice: string }) {
  return (
    <LightningPaymentHelp
      invoice={invoice}
      onHandoff={(event) => {
        // event.status is always "handed_off", never "paid".
      }}
    />
  );
}
```

Use `trigger="button"` for a text button. Omit it for the compact `?` trigger.
`LightningPaymentModal`, `useLightningPaymentHelp`, invoice helpers, and provider
types are also exported.

The reviewed provider database and its schema are available without importing
React:

```js
import providers from "lightning-pay-kit/providers.json" with { type: "json" };
```

Provider records are static package data; the component never fetches a runtime
registry. See the repository’s
[provider-data documentation](https://github.com/pseudozach/lightning-pay-kit/blob/main/docs/PROVIDER_DATA.md)
for evidence rules and raw GitHub URLs.

## Token and network routes

Search `USDT`, `USDT Polygon`, `USDC`, or another catalogued asset in the same search box. Each path names its funding network and compares the invoice's exact millisatoshis with **Lightning-output** limits. Deposit minima and exchange rates are never substituted for payout limits. Unsupported networks, fractional-satoshi invoices, below-minimum and above-maximum paths have no handoff link.

A match is **not** a quote or payment guarantee. Missing, future-dated, or more-than-30-day-old limits stay unknown. Satora refund assets may differ from the original token; check its route-specific warning before funding. The merchant still receives a Lightning payment, not native USDT.

Framework-neutral discovery and separate metadata exports are available:

```ts
import { defaultProviders, defaultPaymentRoutes, discoverPaymentRoutes } from "lightning-pay-kit";

const paths = discoverPaymentRoutes(defaultProviders, defaultPaymentRoutes, {
  query: "USDT Polygon",
  amountMsat: invoiceAmountMsat, // bigint; null when the invoice has no amount
  invoiceNetwork: "bitcoin"
});
```

The raw data and schema are exported at `lightning-pay-kit/payment-routes.json` and `lightning-pay-kit/payment-routes.schema.json`. Hosts can supply reviewed, freshly checked `paymentRoutes` to `LightningPaymentHelp` or `LightningPaymentModal`. Runtime validation still applies.

**API credentials belong on the host's server, never in React props or URLs.** FixedFloat's public feed proves directional pairs, but its deposit limits do not establish invoice limits; exact-output limits need authenticated server-side pricing. Server integrations must validate the returned output amount, error/offline flags, fees, and network before passing normalized limit records. This package makes no API requests or swaps by default.

## Referrals and the BitcoinVN widget

Built-in defaults are `bitcoinvn: efd36219af705e28` and `fixedfloat: pmdxabka`.
**One provider-keyed configuration replaces defaults everywhere**: ordinary provider
cards, token-route handoffs and the BitcoinVN iframe. Omitted keys retain defaults;
`null` disables that provider's referral. There is no ranking boost.

```tsx
import { LightningPaymentHelp, BitcoinVNExchangeWidget, type AffiliateOverrides } from "lightning-pay-kit";

const affiliateOverrides: AffiliateOverrides = {
  bitcoinvn: "YOUR_BITCOINVN_CODE",
  fixedfloat: "YOUR_FIXEDFLOAT_CODE",
};

<LightningPaymentHelp invoice={invoice} affiliateOverrides={affiliateOverrides} />
// Optional standalone widget; shares exactly the same configuration:
<BitcoinVNExchangeWidget affiliateOverrides={affiliateOverrides} />
```

To remove **all current defaults**, use `{ bitcoinvn: null, fixedfloat: null }`.
Existing `{ url: "https://bitcoinvn.io/?ref=YOUR_CODE", disclosure: "Affiliate" }`
overrides remain supported. Custom codes do not overwrite asset, amount or invoice
parameters. String shortcuts are supported only for verified referral contracts.

Clicking the **BitcoinVN provider card** opens its embedded exchange. The card
also retains a real referral URL for opening in a new tab with a modifier click
or browser menu. The iframe is not mounted or fetched before explicit selection. Standalone rendering
is also explicit opt-in. It uses `https://bitcoinvn.io/embed/swap`, permits only
`clipboard-write`, and accepts resize messages only from that exact iframe window
and origin with type `chadshift-embed-resize` and a finite positive numeric height
(capped at 10,000px). Listeners are removed on unmount. Allow
`frame-src https://bitcoinvn.io` in the host's CSP; follow the provider's own CSP for
its internal resources. No global snippet or inline script is needed.

The live widget was also verified with `settle=btcln`: it selects Bitcoin via
Lightning and shows the BOLT11/LNURL/lightning-address input. Without this parameter,
the vendor widget defaults to Monero, so the kit always sets the verified Lightning
destination. Referral overrides cannot change this destination.

BitcoinVN remains a copy/paste invoice flow: the widget does not receive the
merchant invoice, submit a swap, or report settlement. Lightning is selected; paste the invoice at BitcoinVN. The referral program credits eligible completed exchanges,
not canceled orders; rewards are described by BitcoinVN as account-balance USD.
See https://bitcoinvn.io/referral-program.

## Safety and privacy

- No WebLN, NWC, WalletConnect, automatic payment, or wallet-specific guessed URI.
- No runtime telemetry, remote images or project-server requests. Provider pages load only on explicit handoff or widget mounting.
- Invoice parsing, search, and filtering are local.
- Runtime provider records and affiliate overrides require safe HTTPS URLs.
- BitcoinVN and FixedFloat defaults are visibly disclosed and replaceable or disableable through `affiliateOverrides`; affiliation cannot alter ranking.
- Settlement must continue to come from the merchant backend.

MIT licensed. Provider names and trademarks remain their owners’ property; no
third-party logos are shipped.
