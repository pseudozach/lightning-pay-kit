# FixedFloat handoff and Liquid discovery candidate

Checked 2026-10-24 against `origin/main` 33048b2. No publication or money movement.

## Amountless-invoice correction reproduced in the downstream host

The earlier positive-amount characterization below did not reproduce the actual wallet default. The parent reproduced a RED against the installed0.2.2 **actual SMS4Sats wallet component**: FixedFloat directory cards filled a positive-amount invoice, but an amountless invoice produced no `address` parameter. Native first-party Playwright form checks then verified that both forms of invoice remain in `#receive_wallet` and `#receive_wallet_hidden` with `BTCLN` selected. All non-GET/HEAD requests were blocked; this verifies form prepopulation only, not invoice acceptance or payment. Parent evidence: `/root/sms4sats-qa/output/wallet-page-20261024/fixedfloat-native-evidence.json` and `probe-fixedfloat.mjs`.

The corrected shared builder permits a valid, unexpired, mainnet **amountless FixedFloat** invoice, preserves only the authorized referral, omits `toAmount` and `type=fixed`, and never invents an amount or bypasses another provider's amount requirement. Directory/name/token contexts explicitly tell the user to choose amount and verify provider limits. `amountPrefilled:false` distinguishes this from exact-amount links. Positive-amount bounds, expiry, network, whole-satoshi checks and offsite overrides retain their existing guards. Core and rendered tests were observed failing before their fixes; all four affiliate override variants are exercised across directory, provider-name, and token search.

## FixedFloat: existing positive-amount implementation

Main already routes ordinary directory cards, provider-name searches and token routes through `createPaymentRouteHandoff`. The ordinary card chooses a clearly labelled USDT/Tron starting route. Baseline focused tests passed: 18 tests across React prefill and core affiliate-referral suites. The installed downstream 0.2.2 bundle also contains `fixedfloatDefaultRoute`; its version alone does not establish that it lacks this fix.

Strengthened the existing rendered override matrix to compare provider-name search against the directory URL and assert the complete `getAll("ref")` array before token-route comparison. Default `pmdxabka`, replacement, null opt-out and canonical legacy URL override with duplicate refs/shadow payment fields remain covered. No production FixedFloat change was justified by these checks. The shared builder already copies only `ref` and constructs trusted invoice/payment fields separately; successful prefill does not write the clipboard.

Read-only first-party GET evidence: both `https://ff.io/?from=USDTTRC&to=BTCLN&toAmount=0.00001&address=SYNTHETIC` and its `cur_from`/`cur_to` variant returned inline `Exchange.init` data containing `reqFrom: 'USDTTRC'`, `reqTo: 'BTCLN'`, `address: 'SYNTHETIC'`, `toAmount: 0.00001`. Therefore changing `from`/`to` to `cur_from`/`cur_to` would not be an evidence-backed bug fix. The first-party `https://ff.io/assets/js/exchange.min.js?052058` calls `pasteAddress(u.address...)` on initialization. Temporary raw evidence: `/tmp/lpk-ff-old-query.html`, `/tmp/lpk-ff-query.html`, `/tmp/lpk-ff-exchange.js`.

Remaining acceptance gate: parent-owned live browser verification of actual rendered links and the visible provider form, including `#select_currency_from`, `#select_currency_to`, `#select_amount_to`, `#receive_wallet` and `#receive_wallet_hidden`. Server inline data and synthetic fixtures do not prove valid provider acceptance, a payable order, hold-invoice compatibility, or payment success. No live quote/order was created.

## Liquid: truthful discovery, not SideSwap Lightning support

First-party sources inspected:

- https://aqua.net/features — Lightning on Liquid, on-the-fly swaps, Liquid USDT support.
- https://github.com/AquaWallet/aqua-wallet/blob/main/lib/features/boltz/providers/boltz_normal_swap_provider.dart — `LbtcLnSwap.newSubmarine` accepts an invoice; funding uses AQUA's L-BTC asset.
- https://github.com/AquaWallet/aqua-wallet/blob/main/lib/features/sideswap/providers/swap_assets_provider.dart — Liquid USDt can swap to L-BTC; this is separate from the Lightning submarine flow.

Added AQUA discovery for `Liquid`, `L-BTC`, `LBTC`, `USDt Liquid` and `Liquid USDT`. L-BTC uses AQUA's wallet-mediated Lightning swap. USDt is explicitly **two steps**: SideSwap USDt → L-BTC conversion, then AQUA L-BTC → Lightning payment. The two-step explanation is visible before handoff rather than hidden in collapsed terms. Converting USDt is not automatically reversed if the subsequent Lightning payment fails. No SideSwap provider/direct-Lightning route was added, no prefill claimed, no minima invented; live limits remain unknown. AQUA is a wallet, not a browser swap execution integration.

SideSwap website GETs returned 403 and Boltz docs DNS failed in this environment; these are access limitations, not proof of suspension. Boltz remains hidden/unverified as on the baseline. The AQUA source is capability evidence, not an independent live swap-availability test.

## Verification and handoff

Strict RED/GREEN: core Liquid discovery initially failed because `Liquid` had no match; passed after catalog additions. React Liquid test initially failed because the required two-step context was inside `details`; passed after making it visible. FixedFloat additions are characterization/parity assertions against already passing behavior, not a claimed reproduced RED fix.

Final parent gates for `lightning-pay-kit@0.2.3`: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm check:ssr && pnpm check:package` passed, **21 files / 174 tests**. Full Playwright including accessibility, network, mobile320 and desktop: **18 passed**. Both native FixedFloat form probes passed using the actual packed builder; all non-GET/HEAD requests were blocked, so no provider acceptance/payment is implied. The actual SMS4Sats React17 wallet component passed the positive/amountless handoff regression after installation of the tarball; it previously failed on amountless0.2.2. Independent final security/logic review returned PASS with no blocking findings and a source hash manifest at `/tmp/lpk-wallet-handoff-final-review.json`.

Packed artifact: `/tmp/lpk-wallet-handoff-artifact/lightning-pay-kit-0.2.3.tgz`, SHA256 `4795fb801cc6004151d1c0777c4bef9b47c3469f30fd35735610120fdf802b80`. GitHub release assets are the existing downstream distribution channel; this is not an npm-publication claim. No real wallet creation, key handling, invoice creation, funding, quote or spend was used in verification. Build retains pre-existing Zod annotation/chunk-size warnings and local npm-configuration warnings.
