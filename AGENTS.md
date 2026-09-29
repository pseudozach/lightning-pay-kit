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
- FixedFloat has a bundled, visibly disclosed affiliate destination. Hosts may replace it or opt out with `affiliateOverrides`; affiliate state must never change filtering, visibility, or organic ranking.
- Preserve dependency license notices. Logos/trademarks require separate provenance and are excluded from blanket MIT licensing.
- Do not commit dependency directories, secrets, build output, or real invoices. The checked-in product screenshot must come from the synthetic playground fixture.

## Required gates

`pnpm lint && pnpm typecheck && pnpm test && pnpm build`

Also run SSR import, package-content, accessibility, and Playwright viewport checks when configured. No release commit until an independent review reports no security or logic errors.

## Website and GitHub Pages

- `apps/playground` is both the local demo and the public landing page.
- Keep Vite's base path at `/lightning-pay-kit/`; Pages deploys through `.github/workflows/pages.yml`.
- Public agent-facing product context belongs in `apps/playground/public/llms.txt`.
- Keep the landing page dependency-free beyond the existing React/Vite workspace and use only local assets.
- Verify the built page at the subpath, its screenshot asset, responsive layouts, links, and browser console before deploying.
