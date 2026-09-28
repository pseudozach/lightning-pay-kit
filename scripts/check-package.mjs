import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const packages = ["packages/core", "packages/react"];
const forbidden = ["src/", "test/", ".env", "node_modules/", "PRODUCT_BRIEF"];

for (const packageDirectory of packages) {
  const output = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: resolve(packageDirectory),
    encoding: "utf8"
  });
  const report = JSON.parse(output)[0];
  const files = report.files.map((entry) => entry.path);
  for (const fragment of forbidden) {
    if (files.some((file) => file.includes(fragment))) {
      throw new Error(`${packageDirectory} tarball contains forbidden path fragment: ${fragment}`);
    }
  }
  for (const required of ["package.json", "README.md", "LICENSE", "dist/index.js", "dist/index.d.ts"]) {
    if (!files.includes(required)) {
      throw new Error(`${packageDirectory} tarball is missing ${required}`);
    }
  }
  console.log(`${packageDirectory}: ${String(files.length)} intended files, ${String(report.size)} bytes packed.`);
}

const coreBundle = readFileSync(resolve("packages/core/dist/index.js"), "utf8");
for (const forbiddenGlobal of ["window.", "document.", "localStorage", "fetch("]) {
  if (coreBundle.includes(forbiddenGlobal)) {
    throw new Error(`Core bundle unexpectedly references ${forbiddenGlobal}`);
  }
}
const reactManifest = JSON.parse(readFileSync(resolve("packages/react/package.json"), "utf8"));
if (
  reactManifest.main !== "./dist/index.js" ||
  reactManifest.module !== "./dist/index.js" ||
  reactManifest.types !== "./dist/index.d.ts"
) {
  throw new Error("Published package requires main/module/types fallbacks for legacy Next.js resolution.");
}
if (reactManifest.dependencies?.["@lightning-pay-kit/core"]) {
  throw new Error("Published package must not depend on the private workspace core package.");
}
for (const file of ["packages/react/dist/index.js", "packages/react/dist/index.d.ts"]) {
  if (readFileSync(resolve(file), "utf8").includes("@lightning-pay-kit/core")) {
    throw new Error(`${file} still imports the private workspace core package.`);
  }
}
const reactDeclarations = readFileSync(resolve("packages/react/dist/index.d.ts"), "utf8");
if (/from ["']zod["']/.test(reactDeclarations)) {
  throw new Error("Public declarations must not expose Zod implementation types to TypeScript 4 consumers.");
}
console.log("Package content and core side-effect checks passed.");

