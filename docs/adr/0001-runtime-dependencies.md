# ADR 0001: Keep Bitcoin Connect and OpenReceive out of the runtime bundle

**Status:** Accepted  
**Date:** 2026-09-28

## Decision

The first Lightning Pay Kit release will not depend at runtime on either `@getalby/bitcoin-connect-react` or `@openreceive/provider-data`.

- Bitcoin Connect may be reconsidered only as an optional client-only adapter in a future, separately reviewed product scope. The current lightweight picker has no WebLN/NWC connection layer.
- OpenReceive `0.4.11` may be used as a pinned development-time candidate list. Imported records must pass Lightning Pay Kit’s own evidence/status/schema review. Its logos and tutorials are not redistributed.

## Evidence

Versions reviewed:

- `@getalby/bitcoin-connect-react@3.12.3`
- `@getalby/bitcoin-connect@3.12.3`
- resolved `@getalby/lightning-tools@8.2.0`
- `@openreceive/provider-data@0.4.11`

Bitcoin Connect was rejected for this product because it is a wallet-connection stack outside scope, has a large transitive footprint, accesses browser state during import, failed an SSR import (`HTMLElement is not defined`), and does not provide the strict invoice/success guarantees claimed by the earlier broad specification.

OpenReceive is data-only, dependency-free, and SSR-safe, but its bundled registry was generated 2026-06-20, lacks per-capability evidence/status dates, includes suspended or insufficiently verified routes, and does not establish per-logo trademark/license provenance. It is therefore useful research input, not runtime truth.

## Consequences

- The runtime remains small and makes no registry/network request.
- The package ships a conservative static registry with text/initial fallbacks.
- Provider ordering is Lightning Pay Kit’s transparent deterministic order, not OpenReceive route rank.
- Every provider action uses canonical `lightning:` or a verified HTTPS destination with an honest label.
