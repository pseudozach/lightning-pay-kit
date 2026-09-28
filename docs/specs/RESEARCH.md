# Universal Lightning Payment Picker — research and implementation brief

**Research date:** 2026-09-28  
**Goal:** a mobile-first, searchable “How do you want to pay this Lightning invoice?” modal for websites and apps—the Lightning analogue of RainbowKit, but focused on paying a BOLT11 invoice rather than connecting an Ethereum wallet.

## Executive conclusion

Do **not** start from zero. About 70% of the idea already exists across two active MIT projects:

1. **[Bitcoin Connect](https://github.com/getAlby/bitcoin-connect)** provides WebLN/NWC wallet connection and a reusable invoice payment modal with invoice decoding, amount/memo display, QR, copy, generic `lightning:` launch, and host-injected payment-state polling.
2. **[OpenReceive](https://github.com/openreceive/openreceive)** provides the closest current payer-provider catalog through [`@openreceive/provider-data`](https://www.npmjs.com/package/@openreceive/provider-data): 37 wallets/apps/exchanges/services, logos, categories, official links, and several illustrated tutorials.

Neither is the full product requested:

- Bitcoin Connect is a **connection-method picker**, not a searchable catalog of Phoenix, ZEUS, Cash App, Coinbase, Binance, Kraken, etc.
- OpenReceive is a **checkout/provider directory**, but has no search, usually links to a provider homepage/tutorial instead of an invoice-filled app link, and its registry lacks robust live/suspended status and evidence-date fields.

The recommended project is a thin, independent open-source layer that:

- reuses or contributes to OpenReceive’s provider data;
- integrates Bitcoin Connect as an optional WebLN/NWC adapter;
- adds search, categories, per-platform launch strategies, evidence/status metadata, payment verification hooks, and accessibility;
- never claims to enumerate installed apps because browsers cannot do that reliably;
- never claims external payment success merely because an app was opened.

A runtime MCP is unnecessary. An MCP could later help maintain/research the provider registry, but the website component itself should be a normal TypeScript/React package.

---

## Existing projects

| Project | What it already solves | Missing for this idea |
|---|---|---|
| [Bitcoin Connect](https://github.com/getAlby/bitcoin-connect) / [`@getalby/bitcoin-connect-react`](https://www.npmjs.com/package/@getalby/bitcoin-connect-react) | Active MIT React/web-component payment and connection modal; WebLN, NWC, LNbits, LNC and other connectors; `launchPaymentModal({ invoice })`; BOLT11 decode; QR; copy; generic `lightning:` launch; external status injection | No broad wallet/app/exchange directory; no search; no provider-specific app links; connector cards are persistent access methods, not all one-time payer apps |
| [OpenReceive](https://github.com/openreceive/openreceive) / [`@openreceive/provider-data`](https://www.npmjs.com/package/@openreceive/provider-data) | Active MIT checkout and independently usable provider registry; 37 providers; bundled logos; categories; official URLs; six illustrated tutorials; React, browser, and custom-element packages | No search; links generally open a homepage/tutorial rather than a filled invoice; no installed-app discovery; status metadata is too weak; June registry still lists now-suspended Boltz |
| [BTCPay Server](https://github.com/btcpayserver/btcpayserver) | Mature merchant checkout, invoice status, iframe modal, QR/copy/payment-rail selection | Requires BTCPay server/invoice; selects rails, not wallet brands |
| [LNbits](https://github.com/lnbits/lnbits) | Good reference UX: uppercase Lightning QR, `lightning:` hyperlink, copy/download/print/NFC | Server app/Vue components; not a reusable universal React picker |
| [Neutron React payment component](https://github.com/Neutronpay/neutron-react-payment-component) | Processor-specific React checkout with QR/copy/countdown/status | Requires Neutron backend; no payer registry |
| [WebLN](https://www.webln.guide/) | Standard `enable()` and `sendPayment(bolt11)` browser-wallet API | No discovery UI, provider data, logos, or external-wallet picker |
| [NIP-47 / NWC](https://github.com/nostr-protocol/nips/blob/master/47.md) | Persistent, permissioned remote-wallet connection with `pay_invoice` | Not a public one-time payment URI; NWC strings contain secrets and must never be treated like public invoices |

### Version/activity checks

- `@getalby/bitcoin-connect` and `@getalby/bitcoin-connect-react`: npm `3.12.3`, published 2026-05-23; MIT.
- `@getalby/lightning-tools`: npm `9.0.1`, published 2026-07-22; MIT.
- OpenReceive JavaScript packages: `0.4.11`, published 2026-09-21; repository tip checked at 2026-09-23; MIT.
- OpenReceive’s bundled provider registry says `generated: 2026-06-20`, so every record still needs current-status review.

---

## Standards and hard platform constraints

### Correct payment encodings

- BOLT11 recommends `lightning:<bolt11>`, **not** `lightning://<bolt11>`.
- Use uppercase BOLT11 in QR payloads for more efficient QR alphanumeric encoding.
- If an on-chain fallback address exists, BIP321 supports a unified form such as `bitcoin:<address>?lightning=<bolt11>`.
- LNURL-pay, Lightning Addresses, and BOLT12 are separate input types. They can be future modules, but the MVP should not quietly treat them as BOLT11 invoices.

Primary standards:

- [BOLT11](https://github.com/lightning/bolts/blob/master/11-payment-encoding.md)
- [BIP321](https://github.com/bitcoin/bips/blob/master/bip-0321.mediawiki)
- [LNURL LUDs](https://github.com/lnurl/luds)
- [WebLN Guide](https://www.webln.guide/)
- [NIP-47 / NWC](https://github.com/nostr-protocol/nips/blob/master/47.md)

### Browsers cannot enumerate installed Lightning wallets

There is no web standard equivalent to Ethereum injected-provider discovery that lists every installed app handling `lightning:`. Therefore:

- the primary generic action should be **Open installed wallet** using `lightning:<invoice>`;
- a branded wallet row may target a provider-specific custom URI only when that URI is explicitly verified;
- otherwise the branded row should **copy the invoice and open the app/home/help page**, clearly saying that the user must paste or scan it;
- never imply that clicking the Coinbase/Binance logo will inject the invoice if no documented invoice deep link exists.

### Verified app-specific URI examples from current first-party source

These are source-level findings, but each should still be device-tested before release:

| Wallet | Candidate app-specific URI | Evidence |
|---|---|---|
| Phoenix | `phoenix:lightning:<invoice>` | Phoenix iOS source explicitly documents this form to select Phoenix when several Lightning wallets are installed |
| BlueWallet | `bluewallet:lightning:<invoice>` | Current deep-link parser explicitly recognizes and strips this prefix |
| Muun | `muun:<invoice>` | Current Android tests parse this as a Lightning invoice |
| ZEUS | `zeusln:<invoice>` | Current manifests register `zeusln`; parser strips `zeusln:` before invoice handling |
| Alby Go | `alby:<invoice>` | Current Expo config registers `alby`; link parser recognizes the scheme and BOLT11 payload |

Use the standard `lightning:<invoice>` fallback for every compliant wallet. Do not invent custom schemes for providers whose source/docs do not specify one.

### Payment-success detection

Opening another application does not return a preimage to the browser. Therefore:

- WebLN/NWC payments may return a result directly, but `succeeded` requires verification that `SHA256(preimage) === paymentHash`.
- External wallet/exchange/swap flows must be verified by the merchant backend/node/processor through invoice status polling, WebSocket, SSE, or a webhook-backed API.
- Returning focus to the tab, clicking “I paid,” or successfully launching a URI is **not proof of payment**.
- Model `handed_off`, cryptographically verified `succeeded`, and indeterminate `unknown` separately. QR, copy, custom URI and universal-link actions can only become `handed_off`.
- A timeout or disconnect after submission is `unknown`, not automatically `failed`; warn against immediate retry and never retry automatically.
- The component must expose host callbacks such as `getPaymentStatus()` and show authoritative status without converting a handoff into success.

---

## Provider directory

No responsible report can claim a permanent list of “every wallet.” The correct output is a versioned registry with evidence and recency. The following is a defensible seed.

### A. Strong current BOLT11 evidence

#### Native/mobile/browser wallets and payment apps

- **Cash App** — official help instructs scanning a Lightning invoice QR; US; receive unavailable in New York; current help publishes a rolling Lightning limit. [Official help](https://cash.app/help/us/en-us/6506-bitcoin-lightning)
- **Strike** — official support says it accepts BOLT11 invoices, BOLT12 offers, Lightning Addresses and LNURL. [Official support](https://strike.me/support/how-do-i-send-cash-or-bitcoin/)
- **Wallet of Satoshi** — current FAQ explicitly says it pays scanned or pasted Lightning invoices; mode/availability varies by region. [Official site](https://www.walletofsatoshi.com/)
- **Speed Wallet** — current site documents Lightning wallet payments and send/receive. [Official site](https://www.speed.app/send-and-receive)
- **Blink** — current source/API implements BOLT11 payment and registers `lightning:` on mobile. [Source](https://github.com/BlinkBitcoin/blink-mobile)
- **Phoenix** — active self-custody Lightning wallet with current BOLT11 payment source and mobile handlers. [Source](https://github.com/ACINQ/phoenix)
- **ZEUS** — active iOS/Android wallet for embedded/remote Lightning nodes; current source implements invoice payment. [Source](https://github.com/ZeusLN/zeus)
- **AQUA** — active wallet that can pay fixed-amount Lightning invoices through submarine swaps; amountless invoices are a caveat. [Source](https://github.com/AquaWallet/aqua-wallet)
- **Muun** — active self-custodial wallet whose current source parses and pays BOLT11 through its swap-based model. [Source](https://github.com/muun/apollo)
- **Blockstream App (formerly Green)** — active on-chain/Liquid/Lightning application; dedicated Lightning send/invoice flows. [Official page](https://blockstream.com/app/)
- **BlueWallet** — active; current source contains BOLT11/deep-link payment flows. Lightning depends on the user’s configured/current backend; do not repeat the obsolete claim that the retired default LndHub is still universally supplied. [Source](https://github.com/BlueWallet/BlueWallet)
- **Alby browser extension / Alby Hub / Alby Go** — active WebLN/NWC ecosystem; pays BOLT11 through a configured wallet/backend. [Alby](https://getalby.com/)
- **Blixt** — active embedded-LND mobile wallet. [Source](https://github.com/BlixtWallet/blixt-wallet)
- **Breez Mobile** — can pay invoices, but the original mobile app is officially in maintenance mode; mark it accordingly and direct new integration work toward Breez SDK apps. [Source](https://github.com/breez/breezmobile)

#### Exchanges and regional financial apps with current invoice-withdrawal evidence

- **Kraken** — official withdrawal flow accepts an amount-specific Lightning invoice. [Official help](https://support.kraken.com/articles/5068216131988-how-do-i-send-bitcoin-on-the-lightning-network-)
- **Ndax** — Canadian platform; Lightning deposits/withdrawals launched 2026-05-12; invoices, fixed amounts and expiry are documented. [Official announcement](https://ndax.io/en/blog/article/move-bitcoin-faster-with-btc-lightning-on-ndax)
- **OKX** — current official page says to select Lightning withdrawal and paste the destination Lightning invoice. [Official help](https://www.okx.com/en-us/help/how-do-i-withdraw-bitcoin-btc-with-okx-lightning-network)
- **belo** — current official flow says to paste a Lightning invoice or Lightning Address. [Official help](https://help.belo.app/en/articles/5899323-how-to-withdraw-btc-from-belo-via-the-lightning-network)
- **Shakepay** — current official flow says to paste a Lightning address or invoice before sending. [Official help](https://help.shakepay.com/en/articles/12334301-how-to-receive-or-withdraw-bitcoin-on-the-lightning-network)

### B. Important requested providers that require a final manual current check

These should appear in a candidate registry or behind `verification_status: needs_reverification`, not silently represented as verified by this report:

- **Coinbase** — current first-party Lightning help URL exists and OpenReceive includes a tutorial, but its page returned HTTP 403 to this research environment.
- **Binance** — current first-party support URL describes Bitcoin Lightning deposits/withdrawals, but returned an empty anti-bot response here.
- **Bitfinex** and **CoinCorner** — first-party Lightning withdrawal/help URLs exist but blocked automated extraction.
- **River** — current sending help exists, but arbitrary BOLT11 behavior was not conclusively extracted.
- **Bitso**, **Bipa**, **Bitnob**, **Bity/Bitybank**, **Bull Bitcoin**, **Bringin**, **Chivo**, **CoinCorner**, **Mt Pelerin**, **Pouch**, **Ripio**, and other region-specific records in OpenReceive should be reviewed one by one before publication.
- **FixedFloat** — site responds, and OpenReceive contains a payment tutorial, but no current official BOLT11 output documentation was conclusively extracted in this pass. It may be added with a referral URL only after live route/API verification and clear affiliate disclosure.
- **SideShift.ai** — active service, but current evidence found here did not prove that a live route accepts an arbitrary BOLT11 destination.

### C. OpenReceive’s 37-record seed catalog

OpenReceive currently includes:

`Rizful, Boltz, Strike, AQUA, Phoenix, ZEUS, Coinbase, Kraken, Binance, OKX, Bitfinex, KuCoin, Cash App, River, CoinCorner, Bull Bitcoin, FixedFloat, SideShift.ai, Blink, Pouch, Bitnob, Bringin, Mt Pelerin, Bipa, Bitso, Ripio, belo, Shakepay, Bity/Bitybank, Chivo, Speed, Wallet of Satoshi, Bitget, Okcoin, Kryptex, BlueWallet, Alby.`

Treat this as a **seed**, not a truth oracle. Its generated date is 2026-06-20 and it lacks sufficient outage/suspension metadata.

### D. Suspended, maintenance, excluded, or unsupported

- **Boltz:** do not display as a live payment route. Current production source has `swapsSuspended: true`, and the live notice says swap services remain disabled until further notice. The API remains only for cooperative refunds; unilateral refunds do not depend on service infrastructure. [Current source](https://github.com/BoltzExchange/boltz-web-app/blob/master/src/configs/mainnet.ts)
- **Breez Mobile:** usable but maintenance mode; badge it.
- **Relai:** Lightning wallet sunset according to OpenReceive’s exclusion data.
- **Bitrefill:** accepts Lightning for its own products but does not pay arbitrary third-party invoices.
- **Pocket Bitcoin:** fiat-to-wallet delivery/receive flow, not an arbitrary invoice payer.
- **RoboSats:** trade/escrow flow, not a general invoice payer.
- **Lemon Cash:** receiving/deposit evidence only in the reviewed data.
- **Peach:** no verified arbitrary-invoice Lightning payment route.
- **OrangeFren:** aggregator capability not verified.
- **THORSwap:** native BTC support is not BOLT11 support.

---

## Recommended component architecture

### Package layout

```text
@lightning-pay-kit/core       BOLT11 parsing, URI normalization, provider schema, ranking
@lightning-pay-kit/react      Button, modal/bottom sheet, hooks, styled components
@lightning-pay-kit/registry   Versioned provider data, logos, evidence/status metadata
@lightning-pay-kit/adapters   Optional Bitcoin Connect/WebLN/NWC/BTCPay adapters
```

The package name is a working name; check npm/GitHub/trademark availability before publishing.

### Public React API

```tsx
<PayLightningButton
  invoice={bolt11}
  getPaymentStatus={async () => ({ status: "pending" })}
  providers={defaultRegistry}
  config={{
    enableWebLN: true,
    enableBitcoinConnect: true,
    categories: ["wallet", "payment_app", "exchange", "swap"],
    country: "US",
  }}
  affiliateOverrides={{
    fixedfloat: {
      url: "https://…",
      disclosure: "Affiliate link",
    },
  }}
  onProviderSelected={({ providerId, method }) => {}}
  onPaid={({ paymentHash }) => {}}
/>
```

Also export headless primitives and a programmatic `openLightningPaymentModal()`.

### Provider schema

Every provider record should include:

```ts
interface LightningPaymentProvider {
  id: string;
  name: string;
  aliases: string[];
  type: "wallet" | "payment_app" | "exchange" | "swap" | "browser_wallet";
  custody: "custodial" | "self_custodial" | "configurable" | "swap_based";
  platforms: Array<"ios" | "android" | "web" | "desktop" | "extension">;
  regions: { include?: string[]; exclude?: string[]; notes?: string };
  capabilities: {
    bolt11: boolean;
    amountlessBolt11?: boolean;
    bip321?: boolean;
    webLN?: boolean;
    nwc?: boolean;
  };
  launchMethods: Array<
    | { type: "generic_lightning_uri" }
    | { type: "custom_uri"; platform: "ios" | "android"; template: string }
    | { type: "universal_link"; platform: "ios" | "android"; template: string }
    | { type: "copy_then_open"; url: string }
    | { type: "webln" }
    | { type: "nwc" }
  >;
  serviceStatus: "active" | "maintenance" | "suspended" | "retired" | "unknown";
  verificationStatus: "verified" | "needs_reverification" | "unverified";
  lastVerifiedAt: string;
  evidence: Array<{ url: string; claim: string; checkedAt: string }>;
  logo: { path: string; source: string; licenseOrPermission?: string };
}
```

### UX

1. Button: **Pay with Lightning**.
2. Mobile: full-height or near-full-height bottom sheet; desktop: accessible centered modal.
3. Header shows amount, sats/fiat display if supplied, sanitized memo, expiry countdown, network badge.
4. Primary choices:
   - **Open installed wallet** (`lightning:<invoice>`);
   - **Pay with connected wallet** via WebLN/Bitcoin Connect if available;
   - QR and copy/share.
5. Searchable provider directory with tabs or chips:
   - Wallets
   - Payment apps
   - Exchanges
   - Swap from another asset
6. Each provider row states the exact action:
   - “Open Phoenix with invoice”
   - “Copy invoice, then open Coinbase”
   - “Connect through NWC”
   - “Unavailable—service suspended”
7. Badges: self-custody/custodial, account required, KYC, region, maintenance/suspended, affiliate.
8. Remember a preferred provider locally only after opt-in; never transmit it to a registry service by default.
9. Always retain QR and manual-copy fallbacks.

### Security/privacy requirements

- Validate and decode BOLT11 locally; reject malformed, expired, wrong-network, oversized, or unsupported input.
- Sanitize invoice descriptions before rendering; never use raw HTML.
- Never send the invoice, payment hash, payee, amount, NWC secret, or wallet identity to a registry/analytics service.
- NWC connection strings are secrets. Redact them from logs, URLs, crash reports and analytics.
- Require an explicit user gesture before WebLN/NWC payment or launching another app.
- Never initiate a payment merely by opening the modal.
- Allowlist URL schemes/templates; reject `javascript:`, `data:`, and arbitrary registry-provided code.
- Do not infer successful payment from deep-link launch or tab focus.
- Affiliate destinations must be host-configured, visibly marked, and use `rel="sponsored noopener noreferrer"`.
- Do not rank providers secretly by affiliate payout. If sponsored placement exists, label it and preserve an objective/default ranking.
- Respect regional restrictions; do not help users evade geofencing/KYC.

### Accessibility and quality

- WCAG-oriented focus trap, focus return, Escape close, keyboard search/navigation, 44px mobile targets, screen-reader labels, reduced-motion support, contrast checks.
- Responsive tests at 320px width and common iOS/Android sizes.
- Unit tests for BOLT11 normalization, expiry, amountless invoices, testnet/mainnet, URI generation, provider filtering and status gating.
- Component tests for search, categories, disabled/suspended records, clipboard failure and keyboard behavior.
- Playwright tests with mocked handlers/status; never send real funds in CI.
- Storybook examples for all states.

### Registry maintenance

This is the differentiating asset:

- every capability claim requires a first-party evidence URL and `checkedAt` date;
- CI may detect broken URLs, repository archival, app-store disappearance and stale evidence, but HTTP 200 alone must never count as proof of BOLT11 capability;
- records older than 90–180 days should be marked stale for maintainer review;
- suspended/retired records must be disabled immediately without requiring a frontend release, ideally through a signed/versioned remote registry with a bundled safe fallback;
- remote updates must be schema-validated and cryptographically signed or pinned by hash;
- logos must come from first-party brand kits/repos and retain source/license metadata;
- provider PR template should require platforms, regions, invoice instructions, URI evidence, screenshots/tests and reviewer verification.

---

## Open-source/product assessment

### What is genuinely new

The modal alone is not very defensible. The missing product is:

- trustworthy live provider status;
- evidence-backed capability classification;
- verified per-wallet launch templates;
- broad but honest regional/app/exchange coverage;
- accessible polished UX;
- host-supplied payment verification;
- privacy-safe analytics and optional affiliate plumbing.

### Recommended strategy

1. Prototype using `@openreceive/provider-data` plus Bitcoin Connect.
2. Open issues/PRs upstream for search, `serviceStatus`, `lastVerifiedAt`, evidence and launch methods.
3. If upstream scope differs, publish a small companion package rather than forking the entire checkout.
4. Keep the core registry and React primitives open source under MIT/Apache-2.0.
5. Possible paid layer: hosted signed registry/status feed, integration support, white-label themes, SLA, analytics, and merchant processor adapters.
6. Referral income can subsidize maintenance, but must be disclosed and must not corrupt ranking.

### MCP assessment

An MCP does not improve the consumer’s payment click. A useful optional MCP would be **maintainer tooling** with read-only tools such as:

- `list_providers`
- `show_provider_evidence`
- `check_stale_records`
- `check_links`
- `draft_provider_update`

Publishing/activating a provider should still require code review and human approval.

---

# Copy/paste implementation prompt for another coding agent

````text
You are a senior TypeScript/React engineer and payment-UX/security reviewer. Build a production-quality, open-source Lightning invoice payment picker—the equivalent of RainbowKit for choosing how to PAY a Bitcoin Lightning BOLT11 invoice, not an Ethereum-style wallet connector.

PROJECT CONTEXT
- Repository/worktree: <INSERT_REPO_PATH_OR_URL>
- Existing website framework: inspect and detect it before changing dependencies.
- The desired UI is a “Pay with Lightning” button. Clicking it opens a mobile-first bottom sheet / desktop modal.
- It must be searchable and show verified wallets, payment apps, exchanges and swap routes with logos and truthful action labels.
- Do not send funds, use a real invoice, log into services, or add secrets during development.

DO NOT REBUILD EVERYTHING
First inspect and evaluate integration with:
1. https://github.com/getAlby/bitcoin-connect
   - `@getalby/bitcoin-connect-react` provides WebLN/NWC connectors and `launchPaymentModal({ invoice })` with QR/copy/generic `lightning:` behavior.
2. https://github.com/openreceive/openreceive
   - `@openreceive/provider-data` provides an MIT provider registry, logos and tutorials.
Reuse these through adapters or contribute/extend them where reasonable. Do not copy code without preserving license notices. If their APIs cannot satisfy the requirements cleanly, document why and build a thin companion layer—not a wholesale checkout rewrite.

CORE DELIVERABLES
A. Headless TypeScript core:
- BOLT11 parsing/validation, including checksum, secp256k1 signature, required-field cardinality, required feature bits, expiry/network/amount handling and URI normalization.
- Use exact `bigint` millisatoshis throughout. Never use JavaScript `number` for invoice amounts or silently round sub-satoshi values.
- Support BOLT11 invoices beyond Bech32's usual 90-character ceiling and apply the protocol's default 3,600-second expiry when `x` is absent.
- Provider schema and filtering/ranking.
- `lightning:<invoice>` URI generation (never `lightning://`).
- Optional BIP321 unified URI only when an on-chain fallback is explicitly supplied.

B. React package/components:
- `<PayLightningButton />`
- `<LightningPaymentModal />`
- `useLightningPayment()`
- programmatic `openLightningPaymentModal()`
- headless hooks/primitives plus default styles.

C. Provider registry:
Each record must have id, name, aliases, type, custody model, platforms, regions, capabilities, launch methods, service status, verification status, `lastVerifiedAt`, first-party evidence URLs/claims/dates, and logo source/license metadata.

D. Optional adapters:
- Bitcoin Connect / WebLN / NWC
- merchant-supplied invoice-status polling
- generic external wallet launcher
Do not include a runtime MCP in the payment path.

REQUIRED UX
1. Header: amount, sats, optional host-supplied fiat display, sanitized memo, expiry countdown and network.
2. Primary actions:
   - Open installed wallet using `lightning:<invoice>`
   - Pay using existing WebLN provider when detected
   - Connect/pay through Bitcoin Connect when enabled
   - QR, Share and Copy
3. Searchable categories:
   - Wallets
   - Payment apps
   - Exchanges
   - Swap from another asset
4. Each provider row must state what actually happens:
   - “Open Phoenix with invoice” only when a tested custom link exists
   - otherwise “Copy invoice, then open Coinbase”
   - “Connect through NWC” for persistent connectors
   - disabled “Service suspended” for unavailable providers
5. Badges: self-custody/custodial/configurable/swap-based, KYC/account required, platform, region, maintenance/suspended and affiliate.
6. Mobile bottom sheet, desktop modal, fast search, full keyboard support, focus trap/return, Escape close, screen-reader labels, 44px touch targets and reduced-motion support.
7. QR and selectable manual invoice text must remain available even when Clipboard/Web Share/deep links fail.

HARD TECHNICAL TRUTHS
- Browsers cannot enumerate every installed Lightning wallet. Do not claim they can.
- A generic `lightning:` URI may invoke an OS handler/chooser but cannot reliably target a named app.
- Use a named-wallet deep link only with current first-party source/device-test evidence.
- External app launch is not proof of payment. WebLN/NWC may return a result; all other flows must use a merchant/backend `getPaymentStatus()` callback, SSE, WebSocket or webhook-backed poll.
- Do not mark an invoice paid from tab focus, elapsed time, “I paid,” or successful URI launch.
- Model `handed_off`, cryptographically verified `succeeded`, and indeterminate `unknown` as separate states. QR, copy, custom URI and universal-link actions can only become `handed_off`.
- A WebLN/NWC result may become `succeeded` only after verifying `SHA256(preimage) === paymentHash`. A timeout or disconnect after submission is `unknown`, not `failed`; warn against immediate retry and never retry automatically.
- NWC means NIP-47 and is not generic WalletConnect. Do not advertise WalletConnect unless a maintained public Lightning namespace/payment method is explicitly negotiated by both sides.

INITIAL CUSTOM LINK CANDIDATES TO VERIFY ON REAL CURRENT BUILDS
- Phoenix: `phoenix:lightning:<invoice>`
- BlueWallet: `bluewallet:lightning:<invoice>`
- Muun: `muun:<invoice>`
- ZEUS: `zeusln:<invoice>`
- Alby Go: `alby:<invoice>`
These are current-source findings, not permission to skip device tests. Use the standard `lightning:<invoice>` fallback. Do not invent schemes for Cash App, Coinbase, Binance, Kraken, AQUA, Blink or any other provider.

INITIAL PROVIDER RESEARCH
Start from OpenReceive’s 37-record registry, but independently reverify every active record before presenting it as verified. Include at least:
- Cash App, Strike, Wallet of Satoshi, Speed, Blink
- Phoenix, ZEUS, AQUA, Muun, Blockstream App, BlueWallet, Alby, Blixt
- Breez Mobile with MAINTENANCE badge
- Kraken, Ndax, OKX, belo, Shakepay
- Coinbase and Binance only after current first-party verification
- FixedFloat only after confirming a currently live arbitrary-BOLT11 route

Do not list Boltz as live. Its current production source has `swapsSuspended: true` and says swaps are disabled until further notice. You may retain a disabled historical record with evidence.

Keep candidates with incomplete evidence as `needs_reverification`, hidden from the default active list. Receiving Lightning deposits is not proof that a provider can pay an arbitrary third-party invoice. Native BTC support is not BOLT11 support.

SECURITY AND PRIVACY
- Parse invoice locally. Do not send invoice/payment hash/payee/amount/provider choice to a registry or analytics backend.
- Sanitize description/memo; no raw HTML.
- Reject malformed, expired, wrong-network and oversized inputs.
- Never place NWC secrets in logs, URLs, analytics or crash reports.
- Require explicit user gesture for payment or app launch; opening the modal must never send funds.
- Strictly allowlist generated URI schemes and destination domains; reject javascript/data/arbitrary code.
- Referral links are host overrides, visibly labeled “Affiliate link,” with `rel="sponsored noopener noreferrer"`; never secretly rank by commission.
- Respect regional restrictions and do not implement geofence/KYC evasion.
- Do not auto-redirect to an app store after a guessed timeout; give the user an explicit install button.
- Default package behavior must make zero telemetry or project-server network requests. The only default exception is an explicitly configured NWC adapter connecting to user-configured relays.
- Support strict CSP and SSR: no DOM globals at import time, no runtime CDN/fonts/logos, no `eval`, no secret serialization into HTML/RSC/source maps, and no hydration drift from capability or countdown detection.
- Treat third-party logos as separately licensed trademarks. Keep source, checksum, permission/license, attribution and review date in a machine-readable manifest; do not relicense them under the package's MIT license.

PROPOSED API
```tsx
<PayLightningButton
  invoice={bolt11}
  getPaymentStatus={async () => ({ status: "pending" })}
  providers={defaultRegistry}
  config={{
    enableWebLN: true,
    enableBitcoinConnect: true,
    country: "US",
  }}
  affiliateOverrides={{
    fixedfloat: { url: "<HOST_REFERRAL_URL>", disclosure: "Affiliate link" }
  }}
  onProviderSelected={({ providerId, method }) => {}}
  onPaid={({ paymentHash }) => {}}
/>
```
Improve this API if repository conventions suggest a better design, but preserve headless use and strong typing.

TESTS / ACCEPTANCE CRITERIA
- Unit tests: official BOLT11 valid/invalid vectors, checksum/signature corruption, required fields/features, all networks and multipliers, exact `bigint` msat arithmetic, default/custom expiry boundaries, amountless invoices, network mismatch, URI generation, provider search/filter/status and malicious URL rejection.
- State-machine tests: preimage mismatch, timeout before/after submission, abort, rejection, replay, double-click, duplicate payment hash, late response and unmount. No state may move backward from `succeeded`.
- Component tests: mobile/desktop states, keyboard/focus, search aliases, category filtering, suspended-provider disablement, clipboard/share failure and manual-copy fallback.
- Playwright tests at 320px and representative Android/iPhone/desktop viewports with mocked invoice/status handlers. No real payment.
- Verify no invoice contents or NWC secrets enter analytics/network requests.
- Storybook or equivalent examples for pending, paid, expired, amountless, malformed, no-handler, WebLN, suspended service and offline/error states.
- Build, lint, typecheck and tests must pass.
- Produce a README with install instructions, framework examples, security model, provider-submission guide and clear limitation that installed wallets cannot be enumerated.

REGISTRY MAINTENANCE
- Add schema validation.
- Add CI broken-link checks, repository/archive/app-store checks and stale-evidence warnings.
- HTTP 200 is not capability proof; every capability requires first-party evidence and human review.
- Mark evidence stale after a documented window (for example 120 days).
- Design for a signed/versioned remote status registry with a bundled fallback, but do not make the MVP depend on an unsigned remote JSON file.
- Add a provider PR template requiring current first-party evidence, platforms, regions, URI behavior, screenshots/device tests and logo provenance.

WORKFLOW
1. Inspect the target repository and its instructions.
2. Write a short implementation plan and dependency decision (Bitcoin Connect/OpenReceive adapters vs. companion code).
3. Build the smallest complete vertical slice.
4. Run all tests/typecheck/lint/build.
5. Exercise the component in a real browser with mocked invoices.
6. Report exact files changed, commands/results, known limitations and provider records that remain unverified.

Do not stop at a plan or mockup. Deliver a working, tested component in the repository.
````

---

## Sources

- [Lightning BOLT11 specification](https://github.com/lightning/bolts/blob/master/11-payment-encoding.md)
- [BIP321 URI scheme](https://github.com/bitcoin/bips/blob/master/bip-0321.mediawiki)
- [WebLN Guide](https://www.webln.guide/)
- [NIP-47 / NWC](https://github.com/nostr-protocol/nips/blob/master/47.md)
- [Bitcoin Connect](https://github.com/getAlby/bitcoin-connect)
- [OpenReceive](https://github.com/openreceive/openreceive)
- [`@openreceive/provider-data`](https://www.npmjs.com/package/@openreceive/provider-data)
- [BTCPay Server](https://github.com/btcpayserver/btcpayserver)
- [LNbits](https://github.com/lnbits/lnbits)
- [Boltz current web-app source](https://github.com/BoltzExchange/boltz-web-app)
- Provider primary-source links are included inline above.
