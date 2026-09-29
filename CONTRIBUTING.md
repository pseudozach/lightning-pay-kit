# Contributing

Pull requests are welcome to add, remove, re-verify, or improve provider records,
fix country availability, improve tests and accessibility, or strengthen the
library and website themselves. If removing or downgrading a provider, include
the first-party evidence that supports the change.

Use Node 22 and pnpm. Every behavior change follows RED→GREEN→REFACTOR: add a
focused test, run it and confirm the intended failure, implement the smallest
change, then rerun it before the complete gate.

Provider facts are edited only in
`packages/core/src/data/providers.json` and must continue to validate against its
adjacent JSON Schema. Provider changes require a current first-party evidence
URL, mechanism-focused `capabilitySummary`, review date, service/verification
status, and region notes. Community directories are discovery sources, not
capability proof. Specifically distinguish external BOLT11 withdrawal from
Lightning deposits, public-node operation, merchant receipt, Lightning Address
support, or a future integration announcement. An HTTP success response alone
is not capability evidence. Never submit real invoices, credentials, referral
secrets, or wallet-specific URI guesses.

Before handoff, run:

```sh
pnpm lint && pnpm typecheck && pnpm test && pnpm check:provider-data && pnpm build
pnpm check:ssr && pnpm check:package && pnpm e2e
```

