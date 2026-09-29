import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  auditProviderMetadata,
  collectProviderUrls,
  defaultProviders,
  providerDatabaseInfo
} from "../packages/core/dist/index.js";

const args = new Set(process.argv.slice(2));
const outputArgument = process.argv.find((argument) => argument.startsWith("--output="));
const maxAgeArgument = process.argv.find((argument) => argument.startsWith("--max-age-days="));
const outputPath = resolve(outputArgument?.split("=")[1] ?? "reports/provider-audit.json");
const maxAgeDays = Number(maxAgeArgument?.split("=")[1] ?? "90");
const metadataOnly = args.has("--metadata-only");
const strict = args.has("--strict");

async function probeLink(link) {
  const headers = { "user-agent": "lightning-pay-kit-provider-audit/1.0" };
  let response;
  let error;
  for (const method of ["HEAD", "GET"]) {
    try {
      response = await fetch(link.url, {
        method,
        headers,
        redirect: "follow",
        signal: AbortSignal.timeout(15_000)
      });
      if (![405, 501].includes(response.status) || method === "GET") break;
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
    }
  }
  const status = response?.status ?? 0;
  const reachable = (status >= 200 && status < 400) || [401, 403, 429].includes(status);
  return {
    ...link,
    reachable,
    status,
    finalUrl: response?.url ?? null,
    error: reachable ? null : error ?? `HTTP ${String(status)}`
  };
}

const metadataIssues = auditProviderMetadata(defaultProviders, new Date(), maxAgeDays);
const directoryLinks = providerDatabaseInfo.directorySources.map(({ name, url }) => ({
  providerId: `directory:${name}`,
  kind: "directory",
  url
}));
const links = metadataOnly
  ? []
  : await Promise.all(
      [...collectProviderUrls(defaultProviders), ...directoryLinks].map((link) => probeLink(link))
    );
const brokenLinks = links.filter(({ reachable }) => !reachable);
const visibleProviderIds = new Set(
  defaultProviders
    .filter(
      ({ serviceStatus, verificationStatus }) =>
        verificationStatus === "verified" && ["active", "maintenance"].includes(serviceStatus)
    )
    .map(({ id }) => id)
);
const actionableBrokenLinks = brokenLinks.filter(
  ({ kind, providerId }) => kind === "directory" || visibleProviderIds.has(providerId)
);
const report = {
  generatedAt: new Date().toISOString(),
  database: providerDatabaseInfo,
  providerCount: defaultProviders.length,
  metadataIssues,
  links,
  summary: {
    metadataIssueCount: metadataIssues.length,
    checkedLinkCount: links.length,
    brokenLinkCount: brokenLinks.length,
    actionableBrokenLinkCount: actionableBrokenLinks.length
  }
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary));
console.log(`Provider audit report: ${outputPath}`);

if (strict && (metadataIssues.length > 0 || actionableBrokenLinks.length > 0)) {
  process.exitCode = 1;
}
