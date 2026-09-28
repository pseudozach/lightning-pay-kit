# LightningKit MVP Implementation Plan

**Goal:** Build a standalone, open-source TypeScript/React monorepo that safely validates and explains BOLT11 invoices and offers honest WebLN, `lightning:` handoff, QR, and copy payment paths.

**Architecture:** A zero-DOM `core` package owns input normalization, BOLT11 decoding/verification, policy, and the attempt state machine. Optional transport and React packages depend on core. A schema-validated, evidence-backed wallet directory is data-only. A Vite playground exercises the published package boundaries.

**Stack:** pnpm workspaces, TypeScript strict mode, tsup, Vitest, React 18, Testing Library, axe-core, Playwright, Zod, audited noble/scure primitives.

## Scope for the first working vertical slice

1. Initialize workspace, strict shared TypeScript/lint/test/build configuration, MIT source license, separate trademark/assets policy, security and contribution docs.
2. `@lightningkit/core`: bounded raw/`lightning:` normalization, BOLT11 checksum/signature/cardinality/network/amount/expiry validation, exact bigint msat, policy errors, URI generation, preimage verification, and an attempt state machine that separates `handed_off`, `succeeded`, and `unknown`.
3. `@lightningkit/transport-webln`: hydration-safe capability detection; `enable()` and `sendPayment()` only inside explicit `pay()`; abort/rejection/malformed-result handling; preimage verification delegated to core.
4. `@lightningkit/wallet-directory`: strict schema, safe URL/template validation, deterministic filtering/ranking, and a small bundled seed whose unverifiable capabilities are hidden rather than guessed.
5. `@lightningkit/react`: accessible `PayLightningButton`, modal/bottom sheet, headless hook, exact amount/network/expiry summary, WebLN action, generic URI action, local QR, copy/manual fallback, keyboard/focus restoration, live regions, and reduced-motion CSS.
6. `apps/playground`: mocked mainnet/testnet invoice examples and no real-payment path.
7. Verification: focused RED→GREEN tests for every behavior, complete unit/component suite, strict typecheck/lint/build, SSR import check, package tarball inspection, Playwright at 320px and desktop, axe scan, secret/network scan, then independent code review.

## Explicit first-release limits

- NWC is not shipped until encrypted event handling, secret storage injection, replay/request binding, and relay behavior receive their own complete test matrix.
- BIP21 is omitted from the first vertical slice unless implemented and tested fail-closed; raw BOLT11 and canonical `lightning:` are mandatory.
- No named-wallet custom link is enabled without primary evidence plus a recorded real-device test.
- No remote registry, telemetry, affiliate ranking, real invoice payment, app-store probing, or installed-wallet enumeration.
