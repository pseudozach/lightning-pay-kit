# AGENTS.md

Read `PRODUCT_BRIEF.md`, `IMPLEMENTATION_PLAN.md`, and the source material under `docs/specs/` before changing code. The product brief is the controlling scope when older research proposes a more complex wallet-connection kit.

## Non-negotiable rules

- Use strict RED→GREEN→REFACTOR TDD. Run each focused test while failing for the intended reason before implementation.
- Build a thin invoice-payment helper and searchable provider picker—not a wallet connection framework.
- Never use a real invoice, send funds, add credentials, or launch native apps during automated/manual development.
- Never add NWC, WalletConnect, wallet-specific custom URI schemes, custody, balances, or automatic payments.
- The only invoice handoff URI is canonical `lightning:<invoice>`. Named provider rows use verified HTTPS destinations and truthful copy/open instructions.
- Never claim URI, QR, copy, exchange-page, or swap-page handoff means payment succeeded. Those actions are `handed_off` only.
- Do not claim browsers can enumerate installed wallets.
- Treat invoice text and provider metadata as untrusted. Never use `innerHTML`, unsafe URL schemes, or arbitrary URL templates.
- Core/data modules must import under Node/SSR without DOM globals or import-time network/storage/timer behavior.
- Default runtime behavior has no telemetry and no project-server network requests.
- Affiliate links are host overrides, visibly disclosed, and never change organic ranking.
- Preserve dependency license notices. Logos/trademarks require separate provenance and are excluded from blanket MIT licensing.
- Do not commit dependency directories, secrets, generated artifacts, or real invoices.

## Required gates

`pnpm lint && pnpm typecheck && pnpm test && pnpm build`

Also run SSR import, package-content, accessibility, and Playwright viewport checks when configured. No release commit until an independent review reports no security or logic errors.
