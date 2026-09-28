# Releasing to npm and integrating SMS4Sats

## Before the first release

1. Confirm the final npm package name. The current publishable package is
   `lightning-pay-kit` at `packages/react`; the workspace root and core package
   are private.
2. Create the GitHub repository and add it as `origin`.
3. Update repository, bugs, and homepage fields in `packages/react/package.json`
   after the GitHub URL exists.
4. Authenticate locally with `npm adduser` and verify with `npm whoami`. Never
   commit an npm token.

## Verify and inspect

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:ssr
pnpm check:package
pnpm check:react17-next12
pnpm e2e
pnpm audit

mkdir -p /tmp/lightning-pay-kit-pack
pnpm --filter lightning-pay-kit pack --pack-destination /tmp/lightning-pay-kit-pack
```

Inspect and test-install the tarball before publishing. The public package must
not depend on the private `@lightning-pay-kit/core` workspace package.

## Publish

From the publishable package directory:

```bash
cd packages/react
npm publish --access public
```

For later releases, increment the version first and maintain release notes. Use
npm trusted publishing/provenance from GitHub Actions once the repository and npm
package are connected; do not store a long-lived npm token in the repository.

## Install in SMS4Sats

```bash
cd /root/sms4sats
npm install lightning-pay-kit
```

Import `lightning-pay-kit/styles.css` once in the Next application, then render
`<LightningPaymentHelp invoice={invoice} />` beside the existing invoice. The
package supports the site's current React 17 runtime. Settlement status must
continue to come from the SMS4Sats backend; `onHandoff` is navigation telemetry
only and must never be interpreted as payment success.
