# Lightning Pay Kit — Product Brief

## Product

A lightweight, open-source React UI component that answers one question beside a Lightning invoice: **“How can I pay?”**

The host passes a BOLT11 invoice. A small trigger (for example a `?` button) opens an accessible mobile sheet / desktop dialog containing:

- a fast searchable grid/list grouped into wallets, payment apps, exchanges, and swaps;
- truthful provider actions such as “Copy invoice, then open Binance’s Lightning withdrawal instructions”;
- optional host-supplied, visibly disclosed affiliate destinations.

The modal is provider-first: it does not repeat the host page’s QR, invoice text, amount, network, or generic wallet handoff UI.

## Deliberate simplifications

- No NWC, WalletConnect, persistent wallet connection, balances, custody, routing, receiving, or payment execution.
- No wallet-specific custom URI schemes. Named rows never pretend to inject an invoice into an app.
- Browsers cannot enumerate installed native wallets; the component does not claim otherwise.
- Opening a URI, copying, showing a QR, or opening an exchange/swap page means only `handed_off`, never `paid`.
- Payment status remains the merchant’s responsibility through an optional callback.
- No default telemetry or project-server network request.

## OpenReceive strategy

Evaluate `@openreceive/provider-data` as the initial data source, but wrap it behind a small normalized schema. Ship only records whose current action and evidence can be represented truthfully. The UI package must not depend on OpenReceive’s checkout UI. Preserve MIT notices and keep third-party logos/trademarks outside the source-code license grant.

## SMS4Sats compatibility

The public React API must work in the existing SMS4Sats React frontend and accept its invoice string directly. It should support a compact icon/button trigger and avoid global CSS, runtime CDNs, DOM access at import time, or framework-specific server APIs.

Proposed use:

```tsx
<LightningPaymentHelp
  invoice={invoice}
  trigger="button"
  affiliateOverrides={{
    fixedfloat: {
      url: "https://fixedfloat.com/...",
      disclosure: "Affiliate link",
    },
  }}
/>
```

A headless hook and modal component should also be exported so SMS4Sats can style the trigger itself.

## Publication

Working package name: `lightning-pay-kit`. The unscoped npm name was unclaimed when checked on 2026-09-28, but publishing is deferred until the owner confirms the final package/repository name and completes npm authentication on this machine.
