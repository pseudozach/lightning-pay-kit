# Lightning Pay Kit

A small React component that sits beside a BOLT11 invoice and answers one
question: **How can I pay?**

It offers a canonical `lightning:<invoice>` handoff, a locally rendered QR,
copy/manual fallbacks, and a searchable directory of wallets, payment apps,
exchanges, and any independently verified swap routes. It is deliberately not a
wallet connector or payment processor.

## Scope and guarantees

- No WebLN, NWC, WalletConnect, custody, balance access, automatic payment, or
  wallet-specific custom URI schemes.
- Browsers cannot enumerate installed Lightning wallets. The primary action asks
  the operating system to handle the standard `lightning:` URI.
- QR, copy, URI, and provider-page actions emit only `status: "handed_off"`.
  They never mean the invoice was paid. Settlement remains the host backend's
  responsibility.
- No telemetry, remote registry, runtime CDN, remote image, or project-server
  request. Invoice parsing and QR generation happen locally.
- Provider destinations are credential-free HTTPS URLs. Named rows say to copy
  the invoice and open instructions/site; they never imply invoice injection.

The metadata reader validates bounded Bech32 encoding/checksum, known network,
exact `bigint` amount arithmetic, required field cardinality, UTF-8 description,
and expiry. It is intentionally a display helper, not a full BOLT11 signature
or payment validator; the receiving wallet and merchant backend remain the
authorities.

## Install

The package is not published yet. Inside this workspace:

```sh
pnpm install
pnpm build
```

For an eventual npm installation:

```bash
npm install lightning-pay-kit
```

Peer support: React and React DOM 17, 18, or 19. The package uses no React 18-only
runtime APIs; a packed React 17 consumer is part of the release verification.

Import the stylesheet once in the host application:

```tsx
import { LightningPaymentHelp } from "lightning-pay-kit";
import "lightning-pay-kit/styles.css";

export function InvoiceHelp({ invoice }: { invoice: string }) {
  return <LightningPaymentHelp invoice={invoice} />;
}
```

Use `trigger="button"` for a text button or omit it for the compact `?` trigger.

## SMS4Sats integration

The existing invoice string can be passed directly; no adapter or server route
is needed:

```tsx
<LightningPaymentHelp
  invoice={invoice}
  trigger="button"
  onHandoff={(event) => {
    // event.status is always "handed_off", never "paid".
  }}
/>
```

The [playground integration](apps/playground/src/main.tsx)
uses a synthetic regtest-format fixture and performs no app launch or payment.

## Headless/controlled use

```tsx
import {
  LightningPaymentModal,
  useLightningPaymentHelp,
} from "lightning-pay-kit";

function CustomHelp({ invoice }: { invoice: string }) {
  const help = useLightningPaymentHelp();
  return (
    <>
      <button onClick={help.open}>Your own trigger</button>
      <LightningPaymentModal
        invoice={invoice}
        isOpen={help.isOpen}
        onClose={help.close}
      />
    </>
  );
}
```

Core helpers and provider types are re-exported from `lightning-pay-kit`. The
workspace core package is private implementation structure and is not required
or published separately.

## Affiliate overrides

Affiliate URLs are host configuration, never bundled defaults. The URL must be
HTTPS, its disclosure is shown before the click, and rendered links receive
`rel="sponsored noopener noreferrer"`. Overrides replace only the destination
of the matching record and cannot affect directory filtering or organic order.
Hosts cannot make an unverified bundled provider visible by adding an affiliate
override. Pass a separately reviewed provider in the `providers` prop, then add
an override under the same provider ID, only when current first-party evidence
supports it.

## Provider policy

The bundled data is a conservative normalized seed, not a live registry.
Verified active/maintenance records are shown; `needs_reverification`, unknown,
suspended, and retired records are hidden by default. Coinbase, Binance, and
FixedFloat are retained as hidden candidates; Boltz is retained as suspended.
Breez Mobile is visibly marked maintenance.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the evidence
required by a provider submission and
[docs/DEPENDENCY_DECISIONS.md](docs/DEPENDENCY_DECISIONS.md)
for the OpenReceive evaluation.

## Security and privacy

Invoice and provider text is rendered as text, never injected HTML. Memo display
removes control/bidirectional formatting characters and is length bounded. Core
and data imports have no DOM, storage, timer, locale, or network side effects.
External navigation requires an explicit user click. Automated tests never
click the wallet URI or provider destinations.

Read [SECURITY.md](SECURITY.md) for the threat model.

## Development and verification

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:ssr
pnpm check:package
pnpm check:react17-next12
pnpm e2e
```

The Playwright suite covers a 320 px mobile sheet and 1280 px desktop dialog,
focus/Escape behavior, axe, and unexpected runtime requests.

## License

Source code is MIT. Provider names and trademarks remain their owners' property
and are excluded from the license grant. No third-party logos are shipped. See
`TRADEMARKS.md` and `THIRD_PARTY_NOTICES.md`.
