import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const workspace = resolve(".");
const temporaryDirectory = mkdtempSync(join(tmpdir(), "lightning-pay-kit-next12-"));

try {
  const packOutput = execFileSync(
    "pnpm",
    ["--filter", "lightning-pay-kit", "pack", "--pack-destination", temporaryDirectory, "--json"],
    { cwd: workspace, encoding: "utf8" }
  );
  const tarball = JSON.parse(packOutput).filename;
  if (typeof tarball !== "string") throw new Error("pnpm pack did not return a tarball filename.");

  writeFileSync(
    join(temporaryDirectory, "package.json"),
    JSON.stringify(
      {
        name: "lightning-pay-kit-next12-consumer",
        private: true,
        scripts: { build: "next build" }
      },
      null,
      2
    )
  );
  mkdirSync(join(temporaryDirectory, "pages"));
  writeFileSync(
    join(temporaryDirectory, "pages", "index.tsx"),
    `import { LightningPaymentHelp, type PaymentProvider } from "lightning-pay-kit";\n` +
      `const providers: PaymentProvider[] = [];\n` +
      `export default function Page() {\n` +
      `  return <LightningPaymentHelp invoice="invalid" providers={providers} />;\n` +
      `}\n`
  );
  writeFileSync(
    join(temporaryDirectory, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "es5",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: false,
          strict: true,
          forceConsistentCasingInFileNames: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "node",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "preserve",
          incremental: true
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
        exclude: ["node_modules"]
      },
      null,
      2
    )
  );

  execFileSync(
    "npm",
    [
      "install",
      "--legacy-peer-deps",
      "--no-audit",
      "--no-fund",
      "react@17.0.2",
      "react-dom@17.0.2",
      "next@12.3.7",
      "typescript@4.9.5",
      "@types/node@18.19.130",
      "@types/react@17.0.83",
      "@types/react-dom@17.0.26",
      tarball
    ],
    { cwd: temporaryDirectory, stdio: "inherit" }
  );
  execFileSync("npm", ["run", "build"], { cwd: temporaryDirectory, stdio: "inherit" });

  const installedManifest = JSON.parse(
    readFileSync(join(temporaryDirectory, "node_modules", "lightning-pay-kit", "package.json"), "utf8")
  );
  if (installedManifest.dependencies?.["@lightning-pay-kit/core"]) {
    throw new Error("Packed consumer unexpectedly depends on the private core workspace package.");
  }
  console.log("Packed React 17 / Next 12 / TypeScript 4.9 consumer build passed.");
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
