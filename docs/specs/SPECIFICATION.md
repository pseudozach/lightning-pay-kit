# Universal Lightning Payment-Method Picker

**Technical, UX, security, and open-source product specification**  
**Research cut-off:** 2026-09-28  
**Working name:** `LightningKit` (placeholder; run a trademark/package-name search before use)

## 1. Product decision

Build a reusable, headless-first TypeScript library with an accessible React UI—similar in integration quality to RainbowKit, but **not** a “connect any wallet” abstraction and never a custodian. It takes a payment request, validates and explains it locally, and offers only payment paths that are actually available:

1. **WebLN** when an injected provider exists;
2. **Nostr Wallet Connect (NWC / NIP-47)** when the integrator supplies a previously authorized connection;
3. an explicit, user-initiated **`lightning:` URI** handoff;
4. a **verified wallet universal/app link** from a curated directory;
5. **QR and copy** as universal fallbacks;
6. optional **BIP21 with `lightning=`** only when supplied or safely constructed from explicit, validated inputs.

The component must never claim that opening another app means payment succeeded. URI, QR, copy, and universal-link handoffs end in `handed_off`, not `paid`. Only a cryptographically checked result from a bidirectional adapter can become `succeeded`.

### Non-goals for v1

- receiving payments, creating invoices, swaps, routing, custody, balances, fiat quotes, or wallet recovery;
- LNURL-pay or Lightning Address resolution (a later input adapter; do not blur it into BOLT11 payment execution);
- “WalletConnect support” without a documented Lightning namespace and payment method;
- scraping app stores, probing installed apps, or maintaining undocumented deep-link templates;
- server-side invoice payment or transmitting invoices to a project-controlled service;
- automatic payment, retry, or wallet launch on modal open.

## 2. Standards baseline and important corrections

### BOLT11 is the source of truth

The parser must implement the reader requirements in BOLT11, including checksum and signature verification. BOLT11 permits invoices beyond Bech32’s normal 90-character limit, defines network prefixes (`lnbc`, `lntb`, `lntbs`, `lnbcrt`), allows no amount, and defaults expiry to 3,600 seconds when `x` is absent. It requires exactly one payment hash and one payment secret, and either a description or description hash in the current specification [BOLT11].

Use integer millisatoshis or `bigint` throughout. Never use JavaScript `number` for invoice amounts and never round silently. Display sats when divisible by 1,000 msat; otherwise display the exact msat amount and a clear approximate sat rendering if desired.

### Correct URI forms

- Canonical Lightning handoff: `lightning:<BOLT11>`—**not** `lightning://...` [BOLT11].
- Combined on-chain/Lightning fallback: `bitcoin:<address>?...&lightning=<percent-encoded-BOLT11>` [BOLT11, BIP21].
- Unknown BIP21 `req-*` parameters make the URI invalid; unknown non-required parameters may be ignored [BIP21].
- A BOLT11 invoice may contain a signed on-chain fallback address, but the picker must not silently switch rails. Show “Pay on-chain instead” as a distinct action with its own fee/timing warning.

### NWC is not WalletConnect

Nostr Wallet Connect is NIP-47 and uses `nostr+walletconnect://`; the URI includes a **client secret with spending authority**. Requests and responses travel as encrypted Nostr events, with NIP-44 advertised in current capability metadata and legacy NIP-04 behavior retained for compatibility. The `pay_invoice` command accepts an optional msat amount and returns a preimage; the service advertises supported commands in an info event [NIP-47].

WalletConnect’s generic Sign protocol negotiates chain namespaces, methods, events, and accounts. That transport does not itself define a BOLT11 payment method [WalletConnect Namespaces]. Therefore:

- do not advertise generic WalletConnect as Lightning support;
- do not send BOLT11 through an EVM or other unrelated signing method;
- add a WalletConnect adapter only if a maintained, public specification defines a Lightning namespace/method and both sides explicitly negotiate it; test against named implementations;
- use “NWC” in UI to avoid misleading users despite its historical URI spelling.

### WebLN

Treat `window.webln` as a capability discovered after client hydration, not as a wallet identity. Call `enable()` only from a user gesture, then call `sendPayment(invoice)`. Handle provider rejection, disappearance, timeout, and malformed responses. Do not invoke payment on detection or modal open [WebLN].

## 3. Public API and architecture

### Package layout

```text
repo/
  apps/
    docs/                         # static/SSR-compatible documentation
    playground/                   # integration examples, no production secrets
  packages/
    core/                         # zero-DOM parsing, policy, state machine
    react/                        # accessible primitives + styled picker
    transport-webln/              # optional peer dependency / browser-only adapter
    transport-nwc/                # optional adapter; injected secret storage
    wallet-directory/             # generated, tree-shakeable data + schema
    icons/                        # separately licensed assets + attribution manifest
    test-vectors/                 # upstream vectors + malicious corpus
  tooling/
    directory-validator/
    update-bot/
  SECURITY.md
  CONTRIBUTING.md
  GOVERNANCE.md
  TRADEMARKS.md
  LICENSE                         # MIT for source code
```

Publish ES modules and type declarations; provide explicit exports; no import-time access to `window`, `document`, storage, timers, locale, or current time. Mark only actual CSS entry points as side effects. React and ReactDOM are peer dependencies. The parser/core must work in browsers, Node, workers, and SSR.

### Layer boundaries

1. **Input normalizer** accepts raw BOLT11, `lightning:`, or optionally BIP21. It trims only surrounding ASCII whitespace; it does not rewrite internal content. Mixed-case Bech32 remains invalid.
2. **Decoder/verifier** returns a discriminated result, never exceptions for expected invalid input. It verifies checksum, structure, required fields, signature, and supported/required feature bits.
3. **Policy engine** applies expected network, time, amount limits, rail policy, and host confirmations.
4. **Capability detector** runs client-side and reports transports without identifying a provider unless the provider documents identity.
5. **Directory engine** filters and ranks static metadata. It does no network requests.
6. **Payment state machine** owns one attempt at a time and emits typed events.
7. **React layer** renders state; it does not parse or pay independently.

### Suggested TypeScript contracts

```ts
type LightningNetwork = "bitcoin" | "testnet" | "signet" | "regtest";
type Msats = bigint;

type InvoiceErrorCode =
  | "EMPTY" | "TOO_LARGE" | "UNSUPPORTED_INPUT" | "INVALID_BECH32"
  | "INVALID_CHECKSUM" | "INVALID_SIGNATURE" | "INVALID_STRUCTURE"
  | "UNKNOWN_NETWORK" | "NETWORK_MISMATCH" | "UNSUPPORTED_REQUIRED_FEATURE"
  | "EXPIRED" | "NOT_YET_VALID" | "AMOUNT_REQUIRED" | "AMOUNT_OUT_OF_RANGE"
  | "BIP21_REQUIRED_PARAMETER_UNSUPPORTED" | "BIP21_RAIL_CONFLICT";

interface ParsedInvoice {
  raw: string;
  network: LightningNetwork;
  amountMsat: Msats | null;
  createdAt: number;       // Unix seconds
  expiresAt: number;       // checked arithmetic
  paymentHash: Uint8Array;
  payeePubkey: Uint8Array;
  description: { kind: "text"; value: string } | { kind: "hash"; value: Uint8Array };
  fallbackAddresses: readonly string[];
  featureBits: ReadonlyMap<number, "required" | "optional">;
}

interface PaymentPolicy {
  expectedNetwork: LightningNetwork;
  now?: () => number;
  maxInvoiceBytes?: number;             // defensive local cap, documented as non-protocol
  minAmountMsat?: bigint;
  maxAmountMsat?: bigint;
  requireConfirmationAboveMsat?: bigint;
  allowAmountless?: boolean;
  allowOnchainFallback?: boolean;
}

type PaymentStatus =
  | "idle" | "confirming" | "authorizing" | "submitting"
  | "handed_off" | "succeeded" | "rejected" | "failed" | "unknown";

interface PaymentAdapter {
  readonly id: string;
  detect(ctx: DetectContext): Promise<Capability>;
  pay(input: { invoice: ParsedInvoice; amountMsat?: bigint; signal: AbortSignal }): Promise<
    | { kind: "success"; preimage: Uint8Array; feesPaidMsat?: bigint }
    | { kind: "handed_off" }
    | { kind: "rejected" }
    | { kind: "unknown"; reason: string }
  >;
}
```

`success` is accepted only after `SHA256(preimage) === paymentHash`. A transport timeout or disconnect after submission is `unknown`, not `failed`; the UI warns against immediate retry and offers a wallet-history check. URI/QR/copy adapters cannot return `success`.

## 4. Validation and security requirements

### Validation pipeline (fail closed)

1. Enforce a configurable byte cap before expensive parsing (default proposal: 16 KiB, clearly a product DoS limit rather than a BOLT11 limit).
2. Recognize only configured input types. Reject nested, repeated, or ambiguous schemes.
3. Parse Bech32 without its standard 90-character ceiling, but enforce valid casing and checksum.
4. Map the HRP to a known network; compare to `expectedNetwork`; a mismatch is a blocking error.
5. Decode amount with checked integer arithmetic to msat; reject fractional msat and overflow.
6. Validate tagged-field lengths, required cardinalities, UTF-8, route-hint structure, fallback-address network, and required feature bits.
7. Verify secp256k1 signature and derive/check payee key as BOLT11 requires.
8. Compute expiry with checked arithmetic. Expiry is `createdAt + (x ?? 3600)`. At or after expiry, block all pay actions. Re-evaluate at action time, not only render time.
9. Apply host amount policy. For amountless invoices, require explicit user amount for adapters that can pass one (for example NWC’s optional msat amount). For generic URI handoff, state that the wallet will request the amount; do not claim a fixed total. Disable WebLN amountless payment unless the detected provider has a documented amount override extension—the standard `sendPayment(invoice)` alone cannot carry it.
10. For BIP21, reject unsupported `req-*`; validate the on-chain address and Lightning invoice independently. Display each rail’s amount. If they disagree, block combined one-click behavior and require explicit rail choice; never “fix” either signed/requested amount.

### Malicious invoice defenses

- Invoice descriptions are untrusted text: render with text nodes, never HTML/Markdown/linkification. Normalize only for display where necessary; retain exact decoded bytes for diagnostics.
- Isolate bidirectional text (`<bdi>`/CSS `unicode-bidi: isolate`), visualize or strip control characters in the display copy, cap rendered length, and expose the full safe text on demand.
- Display network, exact amount, expiry/countdown, and a shortened payee fingerprint before confirmation. Do not suggest the signature proves a real-world merchant identity—it proves only invoice integrity/key control.
- Require a second confirmation above the host threshold; permit hosts to forbid amountless invoices or set min/max values.
- Maintain an in-memory attempt lock keyed by payment hash. Expose a hook so hosts can persist successful/unknown payment hashes. Never automatically retry.
- Ignore invoice-supplied URLs as navigation targets. Do not fetch route hints, descriptions, logos, or metadata.
- Validate every directory URL against an allowlist of `https:` plus explicitly approved custom schemes. No `javascript:`, `data:`, credentials, fragments carrying secrets, or template expansion outside a typed placeholder.
- Open HTTPS universal links with `noopener,noreferrer` where a new context is used. Custom-scheme navigation must occur only after a click.
- No wallet app detection by hidden iframes, timing probes, app-store redirects, or fingerprinting. Browser/OS URI outcomes are not reliably observable.

### NWC secret handling

- The React/core packages never read an NWC URI from the current page URL and never write one to logs, telemetry, errors, history, or clipboard without an explicit user action.
- Parse connection URIs locally; require `wss:` relays by default; validate key and secret lengths; cap relay count; redact secrets from all error objects.
- Prefer an integrator-provided `NwcConnectionStore`. The default demo is session-memory only. If an optional persistent browser store is provided, use non-extractable Web Crypto keys plus IndexedDB, clearly explain that XSS can still use an unlocked credential, and provide disconnect/revoke guidance.
- Use a unique connection per application, request/advertise only required capabilities, check the info event for `pay_invoice`, set request expiration, and bind each response to request ID/service key.
- Require confirmation for every NWC payment by default even if the wallet connection has a budget. The URI does not provide a universally trustworthy budget introspection mechanism.
- Restrict relay connections in `connect-src` documentation and do not route them through project infrastructure.

### Web security / supply chain

- Zero runtime CDN dependencies, remote fonts, remote logos, analytics, `eval`, or dynamically generated code.
- Support strict CSP: `default-src 'self'; script-src 'self' 'nonce-…'; style-src 'self'; img-src 'self' data:; connect-src 'self' <integrator NWC relays>; object-src 'none'; base-uri 'none'; frame-ancestors <integrator choice>`.
- QR generation is local. If a canvas is used, also provide downloadable SVG/text alternatives without injecting raw SVG from data.
- Pin CI actions by commit SHA; lock dependencies; publish npm provenance/SLSA attestations where available; generate SBOM; enable dependency review and secret scanning.
- Two-person review for releases and directory URL changes. Signed tags; protected branch; documented compromised-release procedure.

## 5. Payment UX

### Default flow

1. Host opens `PaymentPicker` with an invoice and expected network.
2. Immediate local validation. Invalid/expired/network-mismatched invoices show a blocking error and no active pay links.
3. Header shows exact amount (or “Amount chosen in wallet”), recipient description/fingerprint, network badge for non-mainnet, and expiry countdown.
4. Preferred actions:
   - **Pay in browser** if WebLN is present;
   - **Pay with connected wallet** if a valid NWC adapter is configured;
   - **Open a wallet** (system `lightning:` action and curated wallet choices);
   - **Scan QR** and **Copy invoice** always available.
5. Selecting a bidirectional adapter opens a final confirmation. Selecting a handoff explains “We can open the wallet, but this page cannot verify completion.”
6. On verified preimage: success screen and callback. On uncertain result: neutral “Payment status unknown—check your wallet before retrying.”

Do not use a fake progress spinner after external handoff. A “I’ve paid” button may close/continue but must be labeled as user attestation, not verified success.

### QR and copy

- Generate QR locally from the exact invoice. For QR efficiency, uppercase the BOLT11 payload as recommended by BOLT11. Interop-test both raw uppercase BOLT11 and `LIGHTNING:<uppercase invoice>`; select one documented default and expose a host option rather than wallet-specific sniffing.
- Never put NWC connection secrets into a payment QR.
- Show the amount and network adjacent to the QR; QR alone is not confirmation.
- Copy the raw BOLT11 by default. Provide a separately labeled “Copy Lightning URI.” Confirm copy through an `aria-live="polite"` message; fall back to selectable text when Clipboard API is unavailable.

### Mobile/PWA realities

- iOS universal links require a two-way website/app association; Android App Links require declared/verified association. The web component cannot create these relationships for wallet vendors [Apple Universal Links, Android App Links].
- Provider universal links may fall back to a website/store, but only list one when the vendor publishes and controls it. Custom schemes may show an OS chooser, fail silently, or be intercepted; never promise deterministic app selection.
- A PWA is still subject to OS/browser URI handling and user-activation rules. Standalone display mode is not native-wallet discovery.
- `navigator.registerProtocolHandler()` is not a universal answer: browser support and allowed schemes vary, registration needs a secure context/user consent, and a web handler does not reveal native installed wallets [MDN Protocol Handler].
- On desktop, prioritize QR; on mobile, prioritize the generic `lightning:` action, then verified universal links. Always retain copy.

### Accessibility

Conform to WCAG 2.2 AA and WAI-ARIA modal dialog guidance [WAI Dialog]:

- use a real `<dialog>` where support/behavior is tested or a correct `role="dialog" aria-modal="true"` implementation;
- initial focus on a meaningful heading or first safe action, contain Tab/Shift+Tab, Escape closes unless payment submission needs an explicit warning, restore focus to invoker;
- visible close button, accessible name/description, no inert background interaction;
- all actions keyboard-operable, visible focus, at least 24×24 CSS px targets (prefer 44×44), sufficient contrast, reduced-motion support;
- no information by logo/color alone; wallet names are text;
- countdown announcements are throttled (for example only at meaningful thresholds) to avoid screen-reader spam;
- errors are associated with fields and summarized; status uses appropriate live regions;
- zoom to 200%, reflow at 320 CSS px, RTL, long translations, high contrast, and screen reader tests.

## 6. Wallet directory and ranking

### Evidence policy

A wallet entry is not an integration. Each capability must link to vendor-owned documentation or a verifiable source/release. Unverified community reports may be tracked in issues but are not shipped as `supported`. Deep/universal links must be exact documented templates—never guessed from bundle IDs or product names.

Recommended JSON shape:

```json
{
  "$schema": "https://example.org/lightning-wallet.schema.json",
  "schemaVersion": 1,
  "id": "vendor-wallet",
  "name": "Vendor Wallet",
  "website": "https://vendor.example/",
  "platforms": ["ios", "android", "desktop", "web"],
  "networks": ["bitcoin"],
  "capabilities": {
    "lightningUri": { "status": "verified", "evidence": [{ "url": "https://vendor.example/docs/...", "checkedAt": "2026-09-01" }] },
    "bip21Lightning": { "status": "unknown", "evidence": [] },
    "webln": { "status": "unsupported", "evidence": [] },
    "nwc": { "status": "verified", "role": "wallet-service", "evidence": [{ "url": "https://vendor.example/docs/...", "checkedAt": "2026-09-01" }] }
  },
  "links": [
    {
      "kind": "universal",
      "platform": "ios",
      "template": "https://vendor.example/pay?invoice={invoicePercentEncoded}",
      "evidenceUrl": "https://vendor.example/docs/deeplinks",
      "verifiedAt": "2026-09-01"
    }
  ],
  "icon": { "asset": "vendor-wallet.svg", "sha256": "...", "license": "Vendor trademark—nominative use", "source": "https://vendor.example/brand", "attribution": "..." },
  "regions": { "available": [], "unavailable": [], "source": null },
  "commercial": { "sponsored": false, "affiliate": false, "disclosure": null },
  "lastReviewedAt": "2026-09-01"
}
```

The real schema should use enums, reject unknown fields, enforce HTTPS evidence, constrain placeholders to `{invoice}` or `{invoicePercentEncoded}`, and prohibit secrets. `unknown`, `unsupported`, `verified`, and `deprecated` are distinct.

### Ranking

Organic order is deterministic and inspectable:

1. currently usable local adapters (WebLN/NWC), without guessing brand;
2. exact OS + network + required-capability compatibility;
3. user-pinned/recent choices stored locally (opt-in or essential preference only);
4. stable locale-aware alphabetical order.

Search matches normalized wallet name and documented aliases; no fuzzy domain/URL matching. Do not rank by payment amount, merchant, hidden fee, affiliate payout, or remote behavioral profile.

Sponsored entries, if the project ever accepts them, live in a visibly separate “Sponsored” section, carry per-entry disclosure, never displace or alter organic order, and are disabled by default in the package. Affiliate URLs must be opt-in through host configuration; disclose before click and strip tracking in the default directory. Publish the sponsorship policy and annual revenue/conflict report.

### Logos and trademarks

Code can be MIT, but third-party marks cannot be relicensed as MIT. Store each logo’s source, checksum, license/permission, attribution, modification status, and review date in a machine-readable manifest. Prefer vendor brand kits; do not copy app-store images. Exclude marks with unclear terms and render a generated text/initial fallback. `TRADEMARKS.md` must state nominative use and no endorsement. A takedown path and rapid asset release process are required.

### Update automation

A scheduled bot may:

- validate schema, URL syntax, HTTPS, redirects, expiry of `checkedAt`, duplicate IDs, asset hashes/dimensions, and forbidden placeholders;
- open review issues/PRs for stale evidence;
- run documented-link smoke tests with conservative rate limits;
- generate a diff of capability/ranking changes and require human approval.

It must **not** scrape app stores, infer support from HTTP status alone, auto-merge new deep links, or download/relicense logos. Removed/changed vendor docs mark the capability `needs-review`; they do not silently rewrite behavior.

## 7. Privacy and telemetry

Default package behavior: **no telemetry and no network request**, except a user-configured NWC adapter connecting to user-configured relays. The invoice, payment hash, amount, description, wallet choice, NWC pubkeys/secrets, IP address, and payment result are sensitive.

If a host enables telemetry through an injected callback:

- emit coarse local events only (`picker_opened`, `method_selected`, `handoff_started`, `adapter_result`) and never include invoice/payment hash/description/raw errors;
- document the exact event schema and lawful/consent basis; support complete disablement and Global Privacy Control choices;
- use randomized session IDs at most; no cross-site/device IDs, fingerprinting, hidden app detection, or default geolocation;
- wallet ID may be omitted or coarsened unless the host has a clear need and disclosure;
- do not call project servers from the library. The host owns transport, retention, deletion, and disclosure.

## 8. SSR, CSP, and integration behavior

- Server render a neutral validated summary only if parsing is deterministic and uses an explicit `now`; otherwise render a stable shell. Capability detection begins in an effect after hydration.
- Prevent hydration drift: inject a single server timestamp or do countdown rendering client-side; do not derive locale/time during initial render differently on server and client.
- Importing every package under Node with no DOM globals must succeed.
- Styles ship as static CSS or unstyled primitives. Avoid runtime style injection so `style-src 'unsafe-inline'` is unnecessary.
- Use `useSyncExternalStore` or an equivalent stable store for adapter state. Abort listeners/timers/relay requests on unmount.
- Never serialize NWC credentials into SSR props, RSC payloads, HTML, logs, or source maps.

## 9. Test and release plan

### Automated tests

- **Conformance:** upstream BOLT11 valid/invalid vectors; all four networks; every multiplier; amountless; default/custom expiry; description/hash; fallback; unknown optional and unknown required features; checksum/signature corruption; duplicate/missing fields; over-90-character invoice.
- **Property/fuzz:** parser never throws/hangs on arbitrary bytes/Unicode; bounded memory/time; encode/decode round trips where an encoder exists; arithmetic boundaries.
- **Security corpus:** mixed case, whitespace smuggling, scheme nesting, control/bidi text, malicious BIP21 escaping, duplicate query keys, unsupported `req-*`, oversized route hints, JS/data URLs, malicious directory placeholders, NWC secret redaction.
- **State machine:** abort, rejection, timeout-before/after submission, late response, double-click, unmount, retry lock, duplicate payment hash, preimage mismatch. No state may move from `succeeded` backwards.
- **Adapters:** mocked WebLN injected late/present/rejected/malformed; NWC capability negotiation, NIP-44, legacy mode policy, request expiration, wrong signer/request ID, replay, relay disconnect, optional amount.
- **React/accessibility:** Testing Library + axe; keyboard/focus tests; screen-reader manual matrix; reduced motion, zoom/reflow, RTL.
- **SSR/CSP:** render/hydrate in Next.js and Remix examples with no warnings; import with `window` undefined; Playwright under strict CSP with no violations.
- **Browser/device:** current stable Chromium, Firefox, WebKit; real iOS Safari/PWA and Android Chrome/PWA. Verify generic URI, verified universal links, cancellation, no-handler path, QR scan with at least three independent wallets. Record wallet/version/OS/date; compatibility evidence is dated, not eternal.

Use fake invoices only on signet/regtest in automated end-to-end payment tests. Any mainnet smoke test must be manually gated, amount-capped, funded separately, and excluded from pull requests.

### Release gates

- typecheck, lint, unit/integration/e2e, package-size budget, API extractor, schema and license checks;
- 100% branch coverage for validation/policy/state machine (UI can use a lower explicit threshold);
- independent cryptography/parser review before 1.0;
- security threat model and dependency audit; no high/critical unresolved advisories;
- reproducible package contents check, provenance, SBOM, signed release/tag;
- compatibility matrix and directory evidence reviewed within the stated freshness SLA.

## 10. Open-source product strategy

### Positioning

The durable moat is not a huge wallet logo grid. It is trustworthy validation, honest payment-state semantics, an auditable compatibility directory, polished accessibility, and low-friction framework integration. “One component, every safe handoff” is credible; “pay with any wallet” is not.

### Governance and licensing

- MIT for source code; contributor DCO initially (simpler than CLA).
- Metadata under CC0 where contributors have rights; logos remain under their own terms and are excluded from blanket license grants.
- Public RFCs for API/schema changes; semantic versioning; changesets; documented support window.
- Small maintainer team plus directory reviewers; CODEOWNERS for parser/security, transports, directory, and assets.
- `SECURITY.md` with private disclosure address, response targets, supported versions, and safe-harbor language.
- Neutral project brand; no wallet can buy “default” status. Publish governance, sponsorship, conflict, and directory inclusion policies.

### Delivery phases

1. **0.1 core safety:** BOLT11 validation, policy engine, raw/URI QR/copy, headless React dialog, no vendor links.
2. **0.2 browser adapters:** WebLN and NWC behind optional packages; strict attempt-state model; example apps.
3. **0.3 curated directory:** begin with a small set of vendor-documented entries. Add mobile real-device compatibility matrix and asset provenance.
4. **1.0:** external cryptography/security review, WCAG audit, stable API, SSR/CSP examples, release provenance.
5. **Later:** separately scoped LNURL-pay/Lightning Address input resolution, only after SSRF/privacy controls and protocol testing. Do not make it part of the core invoice picker by accident.

Success metrics: integration time, parse/policy correctness, accessibility defects, handoff availability by tested platform, verified adapter completion rate, unknown-result rate, stale-directory age, and security response time—not wallet clicks or affiliate conversion.

## 11. Rigorous implementation-agent prompt

> You are implementing a production-grade open-source TypeScript/React monorepo for a universal Lightning payment-method picker. Work test-first and do not fabricate wallet integrations.
>
> **Primary behavior:** Accept raw BOLT11, `lightning:<invoice>`, and optional BIP21 containing `lightning=`. Parse and verify BOLT11 locally, enforce an explicit expected network, show exact amount/expiry/recipient data safely, and offer WebLN, injected NWC, generic `lightning:` handoff, verified directory links, QR, and copy. Never custody funds or send invoice data to project servers.
>
> **Standards:** Implement the reader requirements from the current BOLT11 specification and BIP21 forward-compatibility rules. Use `lightning:` without `//`. NWC means NIP-47 (`nostr+walletconnect://`) and is not generic WalletConnect. WebLN payment requires a user gesture. Do not claim URI handoff success.
>
> **Architecture:** Create `core`, `react`, `transport-webln`, `transport-nwc`, `wallet-directory`, `icons`, and `test-vectors` packages plus docs/playground. `core` must have no DOM/React dependencies. No package may touch browser globals at import. Amounts are `bigint` msat. Return discriminated results and stable error codes. Model `handed_off`, verified `succeeded`, and `unknown` separately. Verify returned preimages against payment hashes. No automatic retry.
>
> **Security:** Fail closed on checksum/signature/structure/required-feature/network/expiry/policy errors. Use bounded parsing. Treat descriptions as plain untrusted text with bidi isolation. Never log or serialize NWC secrets. Require injected NWC storage and confirmation per payment. No remote assets, runtime CDN, `eval`, hidden app detection, undocumented links, or telemetry. Support strict CSP and SSR. Add a threat model.
>
> **Directory:** Define and validate a versioned JSON Schema. Every claimed capability/link needs dated vendor-owned evidence. Templates permit only typed invoice placeholders. Ranking is deterministic: usable local adapters, compatibility, local user preference, alphabetical. Sponsorship/affiliate data is separate, labeled, and cannot influence organic ranking. Assets require source/checksum/license metadata and must not be relicensed incorrectly.
>
> **UX/accessibility:** Implement WCAG 2.2 AA modal behavior, keyboard/focus management and restoration, text labels, live regions, reduced motion, high contrast, RTL/reflow. Show non-mainnet prominently, meaningful expiry updates, amountless behavior, and an honest unknown-result screen. QR is local; copy has a no-Clipboard fallback.
>
> **Testing:** Start from failing tests. Import official BOLT11 vectors and document their source revision. Add property/fuzz, malicious-input, policy, state-machine, adapter, axe/keyboard, SSR/hydration, strict-CSP, browser, and directory-schema tests. Use only signet/regtest for automated payments. Pin dependencies/actions and produce package provenance/SBOM.
>
> **No guessing rule:** If a wallet’s deep/universal link, WebLN, NWC, BIP21, platform, or region support lacks current primary evidence, mark it `unknown` and omit the action. Generic WalletConnect is not a Lightning payment method. Ask for a source rather than inventing a template.
>
> Deliver working code, tests, docs, examples, threat model, compatibility matrix, and release checklist. Run all checks and report actual outputs; do not stop at scaffolding.

## 12. Acceptance criteria

### Protocol and policy

- [ ] Official BOLT11 vectors pass; corrupt checksum/signature and malformed cardinalities fail.
- [ ] Mainnet/testnet/signet/regtest are distinguished and mismatch blocks every pay action.
- [ ] Expiry default/custom logic is tested at before/equal/after boundaries with an injected clock.
- [ ] Amounts use exact msat `bigint`; all multipliers and amountless invoices behave as specified.
- [ ] Unknown required features fail; unknown optional features do not automatically fail.
- [ ] Raw, `lightning:`, and supported BIP21 inputs normalize without changing signed invoice content.
- [ ] BIP21 unknown `req-*`, escaping ambiguity, rail/network/amount conflicts fail safely.

### Payment semantics

- [ ] No payment or `enable()` happens without a user gesture and final confirmation where required.
- [ ] WebLN/NWC success requires a valid matching preimage.
- [ ] URI, universal link, QR, and copy can return only `handed_off`.
- [ ] Post-submit timeout/disconnect becomes `unknown`, with no automatic retry.
- [ ] Double click/concurrent call/replayed response cannot create a second attempt.
- [ ] Amountless WebLN is disabled absent a documented adapter extension; NWC carries exact optional msat.

### Security/privacy

- [ ] Invalid, expired, mismatched, over-policy, and unsupported invoices expose no enabled payment links.
- [ ] Description/control/bidi payloads cannot create markup, links, spoof adjacent UI, or escape layout.
- [ ] NWC secret never appears in URL/history/log/error/telemetry/SSR/snapshot.
- [ ] Parser fuzzing is bounded; no uncaught exceptions or pathological hangs on the defined corpus.
- [ ] Default build makes zero network/telemetry requests except explicitly configured NWC relays.
- [ ] Strict CSP example has zero violations and requires neither `unsafe-inline` nor `unsafe-eval`.
- [ ] Dependency, license, SBOM, provenance, and secret scans pass release policy.

### Directory/product integrity

- [ ] Schema rejects unknown fields, unsafe URL schemes, unauthorized placeholders, missing evidence, stale/invalid dates, and missing asset provenance.
- [ ] No shipped provider action is based solely on community hearsay or an inferred URL.
- [ ] Ranking snapshot proves affiliate/sponsorship fields cannot alter organic order.
- [ ] Every logo has source/checksum/license status or falls back to generated text.
- [ ] Update automation cannot auto-merge link/capability/logo changes.

### UX/accessibility/platform

- [ ] Dialog meets WAI-ARIA interaction, focus containment/restoration, Escape, labeling, and background-inert requirements.
- [ ] Automated axe plus manual keyboard, screen-reader, 200% zoom, 320px reflow, RTL, high-contrast, reduced-motion checks pass.
- [ ] iOS Safari/PWA and Android Chrome/PWA real-device matrix records generic URI and each listed universal link, including cancel/no-handler behavior.
- [ ] Desktop QR is scanned successfully by at least three independently maintained wallets; exact payload format is documented.
- [ ] SSR examples import/render/hydrate without DOM-global crashes or hydration warnings.

### Release readiness

- [ ] Public API report, semantic-release/changelog workflow, package-size budget, docs and migration policy are complete.
- [ ] Independent parser/cryptography review and WCAG audit findings are resolved or explicitly accepted before 1.0.
- [ ] A clean checkout installs, builds, tests, and packs every package using documented commands.
- [ ] npm tarballs contain only intended files and are signed/provenanced; release tags are signed.

## Sources

Primary sources used for normative or platform claims:

- **BOLT11 payment encoding:** https://github.com/lightning/bolts/blob/master/11-payment-encoding.md
- **BIP21 URI scheme:** https://github.com/bitcoin/bips/blob/master/bip-0021.mediawiki
- **NIP-47 / Nostr Wallet Connect:** https://github.com/nostr-protocol/nips/blob/master/47.md
- **WebLN `enable` and `sendPayment`:** https://www.webln.guide/building-lightning-apps/webln-reference/webln.enable and https://www.webln.guide/building-lightning-apps/webln-reference/webln.sendpayment
- **WalletConnect Sign namespaces:** https://specs.walletconnect.com/2.0/specs/clients/sign/namespaces
- **Apple Universal Links:** https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app
- **Android App Links/deep links:** https://developer.android.com/training/app-links
- **Web protocol handlers:** https://developer.mozilla.org/en-US/docs/Web/API/Navigator/registerProtocolHandler
- **WAI-ARIA modal dialog pattern:** https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- **Content Security Policy:** https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP

### Evidence caveat

This specification intentionally does not name compatible wallets or publish provider link templates. Those are fast-changing operational claims and must enter through the evidence-backed directory review process. Package metadata checked during research showed that available JavaScript BOLT11 libraries differ in age and scope; selecting a parser dependency still requires exact source/API review, vector testing, signature-verification confirmation, maintenance review, and ideally an independent audit. Do not choose one from npm recency alone.
