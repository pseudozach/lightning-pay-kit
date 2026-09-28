# Contributing

Use Node 22 and pnpm. Every behavior change follows RED→GREEN→REFACTOR: add a
focused test, run it and confirm the intended failure, implement the smallest
change, then rerun it before the complete gate.

Provider changes require a current first-party evidence URL, a truthful action
description, review date, service/verification status, region notes, and logo
provenance if an asset is proposed. An HTTP success response alone is not
capability evidence. Never submit real invoices, credentials, referral secrets,
or wallet-specific URI guesses.

Before handoff, run:

```sh
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm check:ssr && pnpm check:package && pnpm e2e
```

