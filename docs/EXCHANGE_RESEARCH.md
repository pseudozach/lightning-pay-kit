# Lightning exchange research snapshot

Reviewed **2026-09-29**. This is the human-readable audit trail behind the provider database, not a second runtime registry.

“Supports Lightning” is not treated as a single capability. For this product, a usable route must let the customer send or withdraw to an external payment request such as the invoice shown by the merchant. Deposits, public-node operation, internal transfers, merchant receipt, or a launch announcement alone do not qualify.

## Verified and shown

These custodial providers currently have sufficiently explicit evidence for an outbound Lightning flow and pass the directory’s active-route filter:

| Provider | Verified outbound mechanism |
|---|---|
| Binance | Lightning BTC withdrawal to BOLT11 where enabled |
| Bitfinex | Convert BTC to LN-BTC and paste the recipient BOLT11 |
| Coinbase | Send BTC to a BOLT11 in supported accounts/regions |
| CoinCorner | Paste a fixed-amount invoice into Recipient |
| Kraken | Submit an amount-specific BOLT11 withdrawal request |
| LN Markets | Paste a BOLT11 into Withdraw |
| Ndax | Submit an amount-specific BOLT11 withdrawal request |
| NiceHash | Enter BOLT11, Lightning Address, or LNURL-pay as the withdrawal destination |
| OKX | Paste a BOLT11 withdrawal invoice where eligible |
| River | Enter BOLT11, LNURL-Pay, or Lightning Address in Bitcoin Send |

The broader active directory also includes verified apps that can pay invoices—such as belo, Bipa, Bitnob, Cash App, Relai, Shakepay, Speed, and Strike—but does not relabel them as exchanges simply to inflate the exchange count.

## Retained but hidden

These records remain in `providers.json` so research is not lost, while `verificationStatus` or `serviceStatus` prevents them from rendering:

| Provider | Reason hidden |
|---|---|
| BtcTurk | Integration confirms deposits/withdrawals, but direct arbitrary-BOLT11 entry needs reverification |
| Bitget | Current public API reports Lightning deposits and withdrawals disabled |
| Bitso | Outbound Lightning is documented; exact external destination input is unclear |
| Bitaroo | Community withdrawal evidence lacks current first-party instructions |
| Bity/Bitybank | Historical support article disappeared |
| Bull Bitcoin | Lightning-compatible delivery advertised; arbitrary-BOLT11 flow not conclusive |
| KuCoin | Current public API reports the `btcln` route disabled |
| Kryptex | Former Lightning article now returns 404 |
| MEXC / Mercado Bitcoin | No current first-party BOLT11 withdrawal instructions found |
| Ripio / Rhino Bitcoin / Tauros / VBTC | Directory leads lack current first-party invoice instructions |
| SimpleFX | Lightning product page exists; current external-invoice flow is not documented clearly |

Other hidden records cover plausible payment apps and swap services under the same fail-closed rule.

## Rejected false positives

The following were found in broad searches or older ecosystem lists but were not added as payable routes:

- **BitMEX and Bitstamp** — operating or integrating Lightning infrastructure does not prove a consumer invoice-withdrawal flow.
- **Buda, WhiteBIT, and Yellow Card** — current first-party asset/network metadata did not expose Lightning withdrawals.
- **Bybit, CoinEx, Crypto.com, and Gate.io** — current support material did not document operational BTC Lightning withdrawal.
- **Robinhood, Swan, and 21bitcoin** — current withdrawal documentation was on-chain only or lacked a current external-invoice flow.
- **CoinGate** — merchant/payment-processing functionality is not the consumer withdrawal workflow required here.
- **LOFT, Paxful, Lastbit, and Bitrefill Thor** — dead, closed, retired, or the wrong product category.

## Discovery coverage

The research universe came from the public sources listed in `providers.json` and [PROVIDER_DATA.md](PROVIDER_DATA.md), then expanded with current integration announcements and first-party APIs/help centers. Community entries were never promoted solely because a list marked them with a Lightning symbol.
