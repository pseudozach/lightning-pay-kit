# Dependency decisions

## OpenReceive provider data

Evaluated `@openreceive/provider-data` 0.4.11 on 2026-09-28. It is MIT and is a
valuable research seed, but its roughly 670 KB unpacked distribution includes
assets and records that do not carry the service-status, evidence freshness,
and action semantics required here. Depending on it directly would also make
an upstream record look like current truth. The runtime therefore does not
depend on it. We preserve the upstream project attribution in
`THIRD_PARTY_NOTICES.md` and manually normalize only independently reviewed,
first-party-evidenced records into our stricter schema.

## Bitcoin Connect

Not included. Its wallet-connection/WebLN/NWC scope conflicts with the
controlling product brief. This package is an invoice handoff helper, not a
connection framework.

## Local primitives

- `@scure/base` supplies audited Bech32 checksum/word conversion without DOM or
  network behavior.
- `zod` validates provider and host-override records at the package boundary.

