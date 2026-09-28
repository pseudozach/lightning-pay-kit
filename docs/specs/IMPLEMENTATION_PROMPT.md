# Lightning Payment Picker — coding-agent prompt

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
