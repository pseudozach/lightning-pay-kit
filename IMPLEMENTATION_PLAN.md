# Lightning Pay Kit MVP Implementation Plan

**Goal:** Build a small open-source React library that takes a Lightning invoice and presents an accessible, searchable “How can I pay?” picker compatible with SMS4Sats.

**Architecture:** One framework-neutral core/data package and one React package in a pnpm workspace, plus a Vite playground. The library uses only canonical `lightning:` handoff, local QR/copy, and verified HTTPS provider/help/swap destinations. It has no wallet-connection or payment-execution layer.

**Stack:** TypeScript strict mode, React 18 peer dependency, pnpm workspaces, tsup, Vitest, Testing Library, axe-core, Playwright, Zod, local QR generation.

## Tasks

1. Initialize workspace configuration, package exports, MIT source license, trademark/logo policy, security/threat model, contribution guide, and dependency decision record.
2. Build `packages/core` test-first:
   - bounded normalization of raw BOLT11 and `lightning:` input;
   - canonical URI creation without `//`;
   - safe invoice display metadata sufficient for amount/network/expiry when available;
   - provider schema, safe HTTPS URL validation, category/search/filter/ranking;
   - affiliate overrides separated from organic ranking;
   - typed handoff events that can never claim payment success.
3. Build `packages/react` test-first:
   - `LightningPaymentHelp`, `LightningPaymentModal`, and `useLightningPaymentHelp`;
   - compact question-mark/button trigger;
   - accessible mobile bottom sheet / desktop modal with focus trap/restore and Escape;
   - searchable category grid/list of wallets, apps, exchanges, and swaps;
   - generic Open Lightning Wallet, local QR, copy, and selectable fallback;
   - truthful named-provider labels; no app-specific URI;
   - optional visibly disclosed FixedFloat/other host affiliate links.
4. Normalize a conservative provider seed from current OpenReceive data, retaining evidence/status metadata and hiding unverified or suspended routes by default. No remote registry at runtime.
5. Build `apps/playground` with fake fixtures only and demonstrate the exact SMS4Sats integration shape.
6. Verify lint, strict typecheck, unit/component tests, build, SSR import, package contents, 320px/desktop Playwright, keyboard/focus behavior, axe, no unexpected runtime network, and no unsafe schemes.
7. Run independent security/logic review, fix blocking findings, then create a verified local commit. Do not publish to npm or create a remote repository until the owner confirms the final name and authenticates npm/GitHub.

## Explicit limits

- No NWC, WebLN, generic WalletConnect, persistent connections, real payments, or wallet-specific custom schemes.
- No automatic swap creation until a provider’s current first-party API, limits, destination model, and affiliate behavior are verified and tested. MVP swap rows may copy the invoice and open a disclosed HTTPS route.
- No claim that a provider can pay arbitrary BOLT11 invoices without current primary evidence.
