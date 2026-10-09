import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("published route metadata", () => {
  it("exports the independent route database and schema for hosts", () => {
    const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    expect(manifest.exports["./payment-routes.json"]).toBe("./dist/payment-routes.json");
    expect(manifest.exports["./payment-routes.schema.json"]).toBe("./dist/payment-routes.schema.json");
    expect(manifest.scripts.build).toContain("payment-routes.json");
    expect(manifest.scripts.build).toContain("payment-routes.schema.json");
  });
});
