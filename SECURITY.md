# Security policy and threat model

Report suspected vulnerabilities privately to the repository owner before
opening a public issue. Until a dedicated security address exists, do not send
invoices, credentials, preimages, or other payment data in a report.

## Trust boundaries

- Invoice strings and provider metadata are untrusted input.
- Parsing is local, bounded, deterministic, and has no import-time side effects.
- The library never sends a payment and never treats a URI, QR, copy action, or
  provider-page visit as proof of payment.
- The only non-HTTPS handoff created by the library is
  `lightning:<normalized-invoice>`, and only after an explicit click.
- Provider and affiliate destinations must be HTTPS and are opened with
  `noopener,noreferrer`; affiliate links are also marked `sponsored`.
- There is no telemetry, installed-app probing, remote registry, dynamic code,
  runtime CDN, or project-controlled network request.

Hosts remain responsible for checking invoice settlement with their backend,
for regional/provider suitability, and for reviewing any URL override they add.

