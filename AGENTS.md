# AGENTS.md

Read `docs/specs/SPECIFICATION.md`, `docs/specs/RESEARCH.md`, and `IMPLEMENTATION_PLAN.md` before changing code.

## Non-negotiable rules

- Use strict RED→GREEN→REFACTOR TDD. Run each new focused test once while failing for the intended reason before implementation.
- Never use a real invoice, send funds, launch an installed wallet during automated/manual development, add credentials, or make runtime analytics/registry requests.
- Do not claim URI/QR/copy handoff is payment success. Only a matching preimage may produce `succeeded`; post-submit uncertainty is `unknown`.
- BOLT11 amount arithmetic uses `bigint` millisatoshis only.
- Core modules must import under Node/SSR without DOM globals and have no import-time clock, locale, storage, timer, or network behavior.
- Treat invoice descriptions as untrusted plain text. Never use `innerHTML`.
- Do not guess wallet capabilities or link templates. Unknown means omitted/disabled.
- NWC means NIP-47, not generic WalletConnect. Do not add NWC until its secret/replay/encryption requirements are fully tested.
- Preserve third-party license notices and keep logo/trademark licensing separate from the MIT source license.
- Do not commit generated dependency directories, secrets, test artifacts, or real invoices.

## Required gates

`pnpm lint && pnpm typecheck && pnpm test && pnpm build`

Run Playwright and package/SSR checks when their scripts exist. No commit until an independent review reports no security or logic errors.
