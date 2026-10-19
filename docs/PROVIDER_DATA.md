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

## Country availability

`regions.scope` distinguishes verified global software/services,
country-specific services, broadly available services with known exclusions, and
unknown/variable availability. `regions.include` is an ISO 3166-1 alpha-2
allowlist for country-specific services; `regions.exclude` identifies known
exclusions for broadly available services. The optional `regions.label` supplies
compact user-facing wording such as `Philippines only`, `Europe`, or
`Availability varies`.

An exact country-name, alpha-2, or alpha-3 search becomes an availability filter:
explicitly local services rank first, then verified global services and eligible
services with complete exclusions. Providers with a nonmatching allowlist,
matching exclusion, or unknown availability are omitted. Country metadata
must be backed by current first-party evidence; do not equate app-store presence
with service availability.

Region shapes are discriminated and fail closed: `country_specific` requires a
nonempty, unique `include` list; `global_with_exclusions` requires a nonempty,
unique `exclude` list; and `global` or `unknown` cannot carry either list. Codes
must exist in the bundled maintained country table. Open-ended legal or
third-party restrictions are `unknown`, not an incomplete exclusion list.

Flags are generated locally from ISO codes using Unicode regional indicators.
No flag images, remote assets, or icon dependency are loaded.

## Discovery directories

The database records each discovery source and its limitations in `directorySources`. The current research used the sources below; the [exchange research snapshot](EXCHANGE_RESEARCH.md) records which candidates were shown, hidden, or rejected and why.

| Source | Role | Limitation |
|---|---|---|
| [LightningExchanges](https://github.com/theDavidCoen/LightningExchanges) | Best structured exchange seed | Community list; many proof links are old announcements |
| [Exchanges-With-LN](https://github.com/cointastical/Exchanges-With-LN) | Broad exchange, broker, wallet, P2P, and swap discovery | Stale and over-inclusive |
| [OpenReceive provider data v4](https://github.com/openreceive/openreceive/blob/master/packages/js/provider-data/src/data/openreceive-providers.v4.json) | Recent structured tutorials and provider leads | Corroboration, not first-party capability proof |
| [Jameson Lopp’s Lightning resources](https://www.lopp.net/lightning-information.html) | Maintained ecosystem/dead-link cross-check | Not its own exchange capability matrix |
| [Lightspark news](https://www.lightspark.com/news) | Newer exchange and finance-app integrations | Partnerships and UMA do not necessarily imply BOLT11 withdrawal |
| [Lightsats wallet-guide source](https://github.com/lightsats/lightsats/blob/c9997c6fa2be0ecaa554229d574f4af9aa3229ac/app/lib/items/wallets.ts) | Pinned official source of the unavailable hosted wallet guide | Discovery names and install links, not proof of current BOLT11 support |

### October 2026 maintenance findings

Breez Mobile is retired and excluded from payment discovery. Its previously cited
`breez/breezmobile` repository returns 404; Breez's [official recovery README](https://github.com/breez/breez-mobile-recovery/blob/610b2511b26da4bb201eac7215c41c7f08948765/README.md#channels)
states that Breez closed the app's channels and recovery moves funds on-chain.
The recovery utility is not a replacement Lightning-payment route. This finding
applies to the original Breez Mobile app, not every product using a Breez SDK.

The original Lightsats hosted guide failed TLS checks; its pinned, publicly
readable first-party wallet-list source preserves discovery provenance without
pretending the hosted guide is available. Neither change relaxes the strict audit
or removes hidden-provider warnings from its report.

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
