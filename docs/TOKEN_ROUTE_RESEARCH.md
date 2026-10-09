# Token-to-invoice catalog research and admission decisions

Checked **2026-10-08 UTC**. This document accompanies the isolated token preview only; nothing was published, committed or paid. Data uses canonical provider schemaVersion 1 and canonical payment-route fields, not the research envelope's `source`, `routeStatus`, `depositLimit` or `minOutputSats` fields.

## What is in the catalog

- **73 provider records**: preserve the original 59 stable IDs, merge all 11 token-provider proposals (9 existing plus Satora and Trocador), add 10 active/verified wallets and 2 hidden historical wallets. Provider metadata is validated by the existing strict runtime parser; schema/enums were not modified.
- **285 source routes**: 16 Satora direct-network token routes, 200 BitcoinVN crypto catalog candidates, 65 actual directional FixedFloat source-to-BTCLN feed pairs, and 4 funded-wallet routes (Arkade on Ark; Blitz, Cake and Blink on Spark).
- The 200 BitcoinVN candidates are **not 200 proven directional swap pairs**. Except for the explicitly quote-tested Polygon method, they have no invoice limits and explicitly require an exact-output provider quote. Source enabled plus payout enabled is insufficient to guarantee compatibility, liquidity or payment.
- No fiat methods were promoted. Independently checked BitcoinVN asset tags identify `VND`, `USD`, `EUR`, `sUSD`, `sEUR`, `sVND` as fiat. None is present among the 200 proposals; no fictional coin ticker or blanket dollar-to-sats conversion is added.
- Two FixedFloat research rows, `fixedfloat-usdtton` and `fixedfloat-usdtop`, were excluded: absent from the actual directional fixed feed. A generic supported-currency catalog is not evidence for these pairs.

## Independent verification (separate from the completed research)

The population worker independently opened these **official GET endpoints** using Playwright on October 8, after ordinary urllib returned HTTP 403 and the lightweight browser failed its GLIBC dependency. No challenge was bypassed, account created or invoice submitted.

| Endpoint | Independently observed | Admission consequence |
|---|---|---|
| <https://api.satora.io/swap-pairs> | Actual `source=137/42161/1/30`, `target=Lightning` pairs; 356–2,000,000 / 356–2,000,000 / 10,000–2,000,000 / 1,000–100,000 sats | Every one of the 16 Satora rows is matched to its own source-chain **and target Lightning**; reverse Bitcoin, Arkade and Lightning-source bounds are not substituted |
| <https://bitcoinvn.io/api/info> | `btcln.enabled=true`, `settleEnabled=true`, required `settleDataFields.invoice`; individually checked all 200 proposed methods enabled/deposit-enabled/non-internal and non-fiat | Catalog compatibility candidates only; do not turn an unverified Cartesian product into a verified directional pair |
| <https://ff.io/rates/fixed.xml> | 4,096 total feed items, 65 `to=BTCLN` pairs; every included proposal source code is present | Directional pair presence is independently verified, **payout limits remain unknown** |

Independent response snapshots are in the worker cache (`catalog-independent-{satora,bitcoinvn,fixedfloat}-output.txt`), outside the repository. They contain real endpoint responses, not synthesized fallback results. Original research snapshots remain the sources for token contracts, exact-output quote observations and wallet release evidence. The catalogs may drift; this is not a live quote service.

## Limits and refund correctness

| Source | Observed invoice bounds | 1,000-sat interpretation |
|---|---|---|
| Satora Polygon and Arbitrum | 356–2,000,000 sats | Within dated published bounds, **not payment success** |
| Satora Ethereum | 10,000–2,000,000 sats | Below minimum |
| Satora native Rootstock RBTC | 1,000–100,000 sats | Within dated bounds |
| BitcoinVN `usdtpolygon` only | 6,115-sat floor; maximum unknown | Below the quote-observed floor |
| Other BitcoinVN methods | Unknown | Must quote; no implied zero minimum |
| FixedFloat | Unknown | Must obtain authenticated exact-output price; no FX-derived invoice minimum |
| Arkade Wallet, funded Ark balance | 500–50,000 sats in **shipped beta solver card** | Within indicative card bounds; solver liveness/quote not exercised |
| Blitz/Cake/Blink, funded Spark balance | Unknown | Provider-specific quote/payment validation required |

BitcoinVN's 6,115 floor comes from completed research's quote-only validation: 200/1,000 sats rejected with an explicit 0.00006115 BTC floor; 10,000 sats created an unaccepted quote, not an order. It is not extrapolated across coins or networks. No quote was reissued by the population worker. Original quote evidence is <https://bitcoinvn.io/api/quotes> and official specification <https://bitcoinvn.io/api/doc.json>.

FixedFloat XML `minamount/maxamount` are **source units**; `tofee` is a fee, and reserves are not invoice maxima. Never convert these to authoritative invoice limits. Its authenticated `POST /api/v2/price` requires `direction=to`, the exact network code and output BTC amount; `data.to.min/max` and errors need verification with separately configured server-side credentials. No key was assumed or used. Public docs: <https://ff.io/api>.

Satora completed research stores 9 nonbinding exact-output quote probes and 7 unquoted catalog/pair token rows. Every row says which level applies. HTTP 200 alone is insufficient: the research's 200-sat Polygon quote returned HTTP 200 despite a 356-sat minimum. Exact net output and limits must be compared; gas, source confirmations, liquidity and short invoice expiry can still prevent payment.

**Refund warning:** the user's provider quote says their refund is tBTC, not their original stablecoin. Preserve this claim without universalizing it. Current pinned OpenAPI describes timeout recovery in the **lock asset (tBTC/WBTC or native RBTC)**, while older docs describe swap-back to the original token. Each Satora route warns of this conflict and asks the payer to confirm network-specific recovery. Neither stablecoin return nor universal tBTC return is promised. Sources: <https://docs.satora.io/llms-full.txt> and <https://github.com/satoraHQ/satora-sdk/blob/23d0d745fc4a1d7e4c6a40f71844cd51dcf76abf/ts-pure-sdk/openapi.json>.

## Identity, networks and discovery

- Satora's current Polygon/Arbitrum token is **USDT0**, not silently renamed USDT. USDT/Tether search aliases still find it. BitcoinVN's `usdt0*` methods explicitly display USDT0, retaining its upstream generic USDT label in notes; `xaut0*` displays XAUt0. Method IDs and token contracts remain distinguishable.
- Numeric chain IDs and network-only aliases from the token proposals were removed from asset aliases. `137`, `42161` and unknown tickers do not become asset discovery queries. `Polygon` alone matches only official POL/MATIC asset names, not stablecoins on that network. Network-qualified symbol/name queries remain precise. Ark/Spark aliases are intentionally curated only for their funded-wallet routes.
- FixedFloat network codes become readable names (Ethereum, Avalanche C-Chain, Arbitrum, Tron, Polygon, etc.), rather than treating a source provider code as a new coin. Source codes remain in stable route IDs and evidence.
- No broad Satora direct Tron, TON, Solana, Base or Optimism intake is invented from bridge tables. Only its 16 direct catalog tokens on the four verified chains are included.
- Blitz Wallet (`blitz-wallet`) is a released Spark wallet and **distinct from Blixt**. No Blitz alias was added to Blixt.
- Tether Wallet is the released consumer product, not WDK/WDKdemo. Its first-party FAQ proves external BOLT11 input and release artifacts prove the consumer app exists. Implementation remains `unknown`; no Spark mode inferred from SDK/ecosystem marketing.

## Wallet additions and boundaries

| Wallet | Admission and caveat |
|---|---|
| Lexe | Current release and BOLT11 send proof; hosted attested LDK node, enrollment required, not an embedded phone node |
| Electrum | Official 4.8.2 distribution and tagged payment parser; desktop/Android, funded channels/outbound liquidity required |
| Bitkit | Current native iOS/Android 2.5.0 invoice handling; embedded spending channels, **not Spark based on an image name** |
| Cake Wallet | Released 6.4.6 Spark/Breez invoice payment; funded Spark balance; **iOS, Android and macOS only**, not Windows/Linux/hardware/watch-only |
| Blitz Wallet | Android-v0.7.15 BOLT11 implementation plus first-party Spark docs; Spark operator liveness and exit assumptions apply |
| Arkade Wallet | Deployed bundle commit `4860c047` matches `4860c0475aa2fd4f3dcf9ce4c1fa2aa68dbb272f`; invoice-to-RFQ-to-covenant flow, not assumed Boltz. Solver card range is shipped indicative metadata; live solver payment not tested |
| BitBanana | Released external invoice request path; backend-dependent LND/Core Lightning/LndHub/NWC custody and credentials |
| Ride The Lightning | Current released native invoice input; self-hosted node manager, not a hosted balance; removed Boltz integration does not remove native send |
| ThunderHub | Current released invoice/pay mutation; user-configured LND backend; disabled Boltz swaps not advertised |
| Tether Wallet | Consumer FAQ and October 8 APK release; email/OTP enrollment, sanctions terms; payment implementation mode unknown |

All ten additions are active/verified and default visible. Full first-party citations remain in each provider's evidence. `open-bitcoin-wallet` and `spark-wallet-legacy` are complete historical records but hidden (`unknown`, `needs_reverification`): returned releases are 2022/2021. Legacy shesek Spark is remote-node software, **not Spark L2**.

Arkade retains valid existing mode `swap`; no `ark` enum/schema migration. Blink's funded Spark route uses its existing first-party self-custodial-account proof. Bitkit is not added as Spark without proof. Wallet of Satoshi's existing record proves self-custodial mode but does not precisely establish Spark funding in this evidence set, so no new WoS Spark route is claimed. Tether also receives no guessed Spark route.

BlueWallet's existing tagged 8.0.1 evidence/summary is left unchanged: Arkade Wallet's newer RFQ path cannot silently prove BlueWallet's current integration. Its historical Boltz attribution remains a **reverification caveat**, not fresh independently checked architecture.

## All token candidate decisions

| Candidate | Decision |
|---|---|
| Satora | Visible; only 16 current direct token/chain rows; quoted versus catalog-only notes and refund warnings |
| BitcoinVN | Visible invoice provider; 200 crypto candidates, just one source method has a quote-tested floor |
| FixedFloat | Visible; 65 actual directional pairs; all output limits unknown |
| Boltz | Preserve ID; `unknown`/`needs_reverification`, no routes or hardcoded source-default 1,000 floor. DNS failure is **not authoritative suspension**; RTL/ThunderHub notices are integration-party evidence |
| Mt Pelerin | Preserve hidden row: broker/wallet Lightning is not direct token-to-arbitrary-invoice proof |
| Pocket Bitcoin | Preserve hidden/non-token outcome: bank-funded purchase is not token intake |
| SecureShift | Hidden: protocol education is not product payout proof |
| SideShift | Hidden/excluded for this task: current BTC catalog proves Bitcoin/Liquid, not Lightning |
| SimpleSwap | Hidden: source-side Lightning article is not output-side arbitrary invoice proof |
| StealthEX | Hidden: credentials needed; specific invoice-output route underproved |
| Trocador/AnonPay | New complete hidden candidate; current docs/site inaccessible, old limit not promoted |
| Breez SDK Spark / Glow | Infrastructure or two-leg wallet flow, not standalone link-only settlement provider |
| OrangeFren | Comparison/discovery frontend, not settlement provider; blocked fetch does not verify limits |
| eXch | Historical lead, not reverified or recommended |

## All retained wallet candidate decisions

| Candidate | Decision / remaining proof |
|---|---|
| Fulmine | Retain research only: rc-named release/service proto does not establish current outgoing consumer BOLT11 path; do not infer historical Boltz |
| VTX | Identity unresolved; VTXO is a protocol concept, not an established wallet brand |
| LNbits | Released external BOLT11 API proven, but bounded consumer UI/account/custody/action still required; not automatically myLNbits SaaS |
| ShockWallet | Beta invoice card exists; full input-to-payment/backend/account/custody chain underproved |
| LifPay | Short-link identity unresolved; guessed site is merchandise, not proof of original retirement |
| ZEBEDEE/ZBD | Current infrastructure site; consumer invoice input/availability/policy underproved |
| Rizful | Lightning/send marketing insufficient; exact BOLT11 input and policies required |
| Walletano | JS shell; current released input/action/policy proof required |
| Sats.mobi | Bot identity found; no bot started, send/policy verification incomplete |
| Valet / Standard Sats | Old synthetic-fiat/hosted-channel information warns it may be outdated |
| BoltCard Wallet | NFC card support is not arbitrary invoice wallet input; official-domain fetch failed |
| Fully Noded / Plasma | Split identities: main product on-chain; research Plasma Lightning release separately |
| Clams | Current accounting product, not consumer invoice payer |
| BitcoinTribe | Historical/testnet/RGB-focused returned release; current production Lightning path unproved |
| Nayuta | Guide beta mention only; no current first-party promotion |
| Spark / WDK / WDKdemo / Ark protocol | Infrastructure is not standalone consumer payment destination; actual released wallets only |
| Other Spark ecosystem wallets | Xverse, Layerz, Coinsnap POS, Bread, Rumble, DFX etc. remain discovery-only; partner listing alone is not input proof |

## Public API, schema and safety gaps

- Public Satora pair/token/version/quote GET metadata is usable for research. `/tokens` was blocked in completed research; `/evm-tokens` succeeded there. Official docs discourage production direct-REST execution in favor of SDK. Backend and SDK release tracks differ. No SDK initialized here.
- BitcoinVN public info/spec/pair endpoints do not eliminate per-source exact-output quote validation. `minOrderSize/maxOrderSize` are USD-equivalent, not output sats. Quotes and orders are separate; no order was created.
- FixedFloat public feed proves direction, not exact-output limits. Credentials are needed for price lookup and must never be bundled in the browser.
- No public machine-readable wallet-wide invoice floors are invented. Arkade card is shipped beta metadata, not solver liveness or executed quote proof.
- Provider Boolean account/KYC fields cannot represent unknown. False refers to documented wallet-only enrollment/payment, not third-party fiat/off-ramp or backend rules. Lexe and Tether account flags are true. Geographic scope on additions is unknown, not universal availability. Cake desktop OS limits are explicit in summary and evidence.
- Metadata does not include route operational-status enums. Excluded inactive routes stay absent. Catalog-only unknowns remain explicit in notes. Eligibility is local dated arithmetic, never quote/payment execution.
- Static/SSR-safe import remains network-free. No wallet initialization, seeds, credentials, invoice submission, token approval, order, swap, funding, refund, payment or tracking was performed. Payer manually pastes their invoice at the provider after copy/open. Link handoff cannot claim `paid`.

## Test evidence

`packages/core/test/catalog-routes.test.ts` uses the real strict parsers, canonical JSON and pure discovery, with a fixed clock `2026-10-08T23:00:00Z`. Four vertical catalog tracer bullets were observed RED before population/enrichment (missing Satora, missing wallets/funded routes, missing BitcoinVN quote floor/USDT0 identity, unreadable Avalanche network), then GREEN. Additional invariants cover canonical identity/reference/evidence shape, no fiat, catalog-only versus paired claims, hidden providers, no numeric/network-only alias pollution, refund risk, stale limits and fractional-satoshi handling. Full core suite is run after population. No core module/schema/UI files were edited by this worker.
