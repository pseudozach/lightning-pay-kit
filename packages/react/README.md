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

## Safety and privacy

- No WebLN, NWC, WalletConnect, automatic payment, or wallet-specific guessed URI.
- No runtime telemetry, provider fetch, remote image, or project-server request.
- Invoice parsing, search, and filtering are local.
- Runtime provider records and affiliate overrides require safe HTTPS URLs.
- FixedFloat uses a visible default affiliate link that hosts can replace or disable with
  `affiliateOverrides={{ fixedfloat: null }}`; affiliation cannot alter ranking.
- Settlement must continue to come from the merchant backend.

MIT licensed. Provider names and trademarks remain their owners’ property; no
third-party logos are shipped.
