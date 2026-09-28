# Compatibility verification

Checked on 2026-09-28.

## SMS4Sats

A clean temporary copy of `/root/sms4sats` was tested without modifying the real
frontend:

- Next.js `12.3.3`
- React / React DOM `17.0.2`
- Node.js `24.21.0`
- a locally packed `lightning-pay-kit` tarball
- a smoke page importing and rendering `LightningPaymentHelp`

`npm run build` (including the project's static export) completed successfully.
The published package uses no React 18-only runtime API and its peer range is
`>=17 <20`.

This verifies build/SSR integration, not visual placement in SMS4Sats. The other
agent integrating the component should still run the frontend's own tests and
browser-check the actual invoice flow.
