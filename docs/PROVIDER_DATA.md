# Provider database

The canonical database is [`packages/core/src/data/providers.json`](../packages/core/src/data/providers.json). Its strict JSON Schema is [`packages/core/src/data/providers.schema.json`](../packages/core/src/data/providers.schema.json).

It is static, reviewed source data. The React package never fetches a remote registry at runtime.

## Reuse

Use either the repository files or the published package exports:

```js
import providers from "lightning-pay-kit/providers.json" with { type: "json" };
import schema from "lightning-pay-kit/providers.schema.json" with { type: "json" };
```

Raw GitHub URLs:

- `https://raw.githubusercontent.com/pseudozach/lightning-pay-kit/main/packages/core/src/data/providers.json`
- `https://raw.githubusercontent.com/pseudozach/lightning-pay-kit/main/packages/core/src/data/providers.schema.json`

## What a record means

A provider is displayed only when both conditions hold:

- `verificationStatus` is `verified`; and
- `serviceStatus` is `active` or `maintenance`.

Other records remain in the public database as research candidates or current negative findings, but are fail-closed in the UI. A provider being listed in a community directory, operating a Lightning node, generating deposit invoices, or accepting merchant payments is **not** sufficient evidence that it can pay an arbitrary external BOLT11 invoice.

`capabilitySummary` is user-facing text explaining the actual payment mechanism or withdrawal flow. `lightningModes` is machine-readable classification. `evidence` records the direct source used for the status and claim.

## Discovery directories

The database records each discovery source and its limitations in `directorySources`. The current research used the sources below; the [exchange research snapshot](EXCHANGE_RESEARCH.md) records which candidates were shown, hidden, or rejected and why.

| Source | Role | Limitation |
|---|---|---|
| [LightningExchanges](https://github.com/theDavidCoen/LightningExchanges) | Best structured exchange seed | Community list; many proof links are old announcements |
| [Exchanges-With-LN](https://github.com/cointastical/Exchanges-With-LN) | Broad exchange, broker, wallet, P2P, and swap discovery | Stale and over-inclusive |
| [OpenReceive provider data v4](https://github.com/openreceive/openreceive/blob/master/packages/js/provider-data/src/data/openreceive-providers.v4.json) | Recent structured tutorials and provider leads | Corroboration, not first-party capability proof |
| [Jameson Lopp’s Lightning resources](https://www.lopp.net/lightning-information.html) | Maintained ecosystem/dead-link cross-check | Not its own exchange capability matrix |
| [Lightspark news](https://www.lightspark.com/news) | Newer exchange and finance-app integrations | Partnerships and UMA do not necessarily imply BOLT11 withdrawal |

## Review standard

A visible exchange/payment-app record normally needs current first-party material showing one of:

1. paste or scan an external Lightning invoice;
2. enter an external BOLT11 in the withdrawal flow; or
3. an equally explicit current send/withdraw workflow.

Current public asset/network APIs can also establish that a formerly announced route is disabled. Anti-bot protection is treated as an accessibility limitation—not evidence that a documented product disappeared.

## Automated maintenance

`pnpm check:provider-data` validates structure, dates, copy quality, and staleness without network access.

`pnpm audit:providers` additionally probes action and evidence links. The weekly `provider-audit.yml` workflow uploads its JSON report and opens or updates a single review issue when a visible route breaks or evidence becomes older than 90 days. Broken links on hidden research candidates remain in the report but do not keep CI permanently red.

Automation never changes capability, custody, region, KYC, or visibility claims and never publishes a release. Those changes require a reviewed pull request with updated evidence.
