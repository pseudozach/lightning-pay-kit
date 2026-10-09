# Verified browser prefill

The helper builds links locally. It does not contact providers, connect wallets, create orders, or execute swaps/payments. Clicking an external link shares the invoice with that provider. Provider quote, invoice acceptance and payment success are separate.

## Satora

The ordinary directory/name-search Satora card now also uses the verified Arbitrum USDC → Lightning URL for an eligible invoice, explicitly labels this starting asset/network, and skips clipboard writes. When that default is not eligible, the card opens the local coin/network route selection instead of silently losing the invoice at the provider homepage. Custom destination overrides are preserved. Verification clicks the actual ordinary card in the public mobile preview and asserts the resulting live Satora source selector, invoice field, and 0.00001 BTC target for the synthetic 1000-sat invoice.

Verified live user-supplied route on the deployed app (frontend 0.3.21):
`https://app.satora.io/42161:USDC/lightning:BTC?targetAmount=1000&address=<BOLT11>`
The live form selected Arbitrum USDC, retained the exact invoice, and showed target output `0.00001 BTC`. Thus targetAmount is integer output sats, not a source-token deposit amount.

Builders use the reviewed canonical source asset and chain: Ethereum 1, Polygon 137, Arbitrum 42161, Rootstock 30. Token spelling is preserved, including USDT0 and tBTC. Several live batch reads initially showed blank/loading source selection; these are not settlement/liveness proofs. No wallet was connected or funded.

## FixedFloat

The ordinary directory and FixedFloat name-search cards use the same reviewed handoff builder as token-route cards, starting with USDT on Tron → Bitcoin Lightning. The card states this starting network; users can change the source at FixedFloat. All three entry points preserve the exact invoice/output amount and shared referral overrides (including `null` opt-out), without relying on the clipboard. Offsite custom destinations retain their original URL and never claim prefill. Real-form verification clicks the rendered cards at mobile/desktop widths and checks `select_currency_from`, `select_currency_to`, `select_amount_to`, `receive_wallet` and `receive_wallet_hidden`; URL retention alone is insufficient.

Verified in the live form:
`https://ff.io/?from=USDTTRC&to=BTCLN&toAmount=0.0001&address=<BOLT11>&type=fixed`
Source selected Tether/TRC20; destination selected Bitcoin/Lightning; receive amount retained 0.0001; both destination textareas retained the invoice. The synthetic zero-signature invoice elicited an internal validation error, so this proves parameter binding, NOT acceptance of that invoice or service liveness.

Canonical route IDs retain the independently verified fixed XML source code, uppercased for `from`. `toAmount` is output BTC, constructed with bigint integer/remainder arithmetic; no floating-point conversion, no source-amount field. Published output limits remain unknown pending a proper provider quote.

Disclosed same-origin root referral URLs using `ref` are retained. Arbitrary custom override destinations are not rewritten.

## Fallbacks and safety

Other services retain copy/open until their invoice-prefill contract is verified. BitcoinVN's deployed script supports `deposit`, `settle`, and selected `settleData[...]` fields, but its ordinary address-prefill handler does not include the Lightning `invoice` field; do not infer invoice support from generic address support.

Malformed, expired, amountless, fractional-sat and nonmainnet invoices are never prefilled. Actual amount eligibility is recomputed, not trusted from a caller-provided label. Known blocking bounds stay blocked; unknown limits still require the provider quote. Generated links over 8192 characters fall back to copy/open. Unsafe provider fallback URLs are rejected through existing provider validation.
