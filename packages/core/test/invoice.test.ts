import { describe, expect, it } from "vitest";
import { createLightningUri, parseInvoiceMetadata } from "../src/index.js";
import { fakeInvoice } from "./fixtures.js";

describe("invoice normalization and display metadata", () => {
  it("normalizes raw and lightning: input without creating a // URI", () => {
    const invoice = fakeInvoice();

    expect(createLightningUri(`  LIGHTNING:${invoice.toUpperCase()}\n`)).toBe(
      `lightning:${invoice.toLowerCase()}`
    );
    expect(createLightningUri(invoice)).not.toContain("lightning://");
  });

  it("decodes exact bigint amount, network, description, and default expiry", () => {
    const invoice = fakeInvoice({ createdAt: 1_700_000_000 });
    const result = parseInvoiceMetadata(invoice, { now: 1_700_000_001 });

    expect(result).toEqual({
      ok: true,
      invoice,
      network: "bitcoin",
      amountMsat: 1_000_000n,
      description: "Synthetic test invoice",
      createdAt: 1_700_000_000,
      expiresAt: 1_700_003_600,
      expired: false
    });
  });

  it("fails closed for an oversized or malformed input", () => {
    expect(parseInvoiceMetadata(`lnbc${"q".repeat(17_000)}`)).toMatchObject({
      ok: false,
      code: "TOO_LARGE"
    });
    expect(parseInvoiceMetadata("javascript:alert(1)")).toMatchObject({
      ok: false,
      code: "UNSUPPORTED_INPUT"
    });
    expect(parseInvoiceMetadata("lightning://lnbc1bad")).toMatchObject({
      ok: false,
      code: "UNSUPPORTED_INPUT"
    });
  });

  it("preserves amountless invoices and applies custom expiry at the boundary", () => {
    const invoice = fakeInvoice({ amountHrp: "", createdAt: 1_700_000_000, expiry: 90 });
    const before = parseInvoiceMetadata(invoice, { now: 1_700_000_089 });
    const atBoundary = parseInvoiceMetadata(invoice, { now: 1_700_000_090 });

    expect(before).toMatchObject({ ok: true, amountMsat: null, expiresAt: 1_700_000_090, expired: false });
    expect(atBoundary).toMatchObject({ ok: true, amountMsat: null, expired: true });
  });

  it("rejects integer tags that cannot produce finite safe timestamps", () => {
    const result = parseInvoiceMetadata(
      fakeInvoice({ expiryWords: Array<number>(300).fill(31) }),
      { now: 1_700_000_001 }
    );

    expect(result).toMatchObject({ ok: false, code: "INVALID_STRUCTURE" });

    let remaining = Number.MAX_SAFE_INTEGER;
    const maximumSafeWords: number[] = [];
    while (remaining > 0) {
      maximumSafeWords.unshift(remaining % 32);
      remaining = Math.floor(remaining / 32);
    }
    expect(parseInvoiceMetadata(fakeInvoice({ expiryWords: maximumSafeWords }))).toMatchObject({
      ok: false,
      code: "INVALID_STRUCTURE"
    });
  });

  it("rejects malformed payment hash and payment secret field lengths", () => {
    expect(
      parseInvoiceMetadata(fakeInvoice({ paymentHashWords: Array<number>(51).fill(0) }))
    ).toMatchObject({ ok: false, code: "INVALID_STRUCTURE" });
    expect(
      parseInvoiceMetadata(fakeInvoice({ paymentSecretWords: Array<number>(51).fill(1) }))
    ).toMatchObject({ ok: false, code: "INVALID_STRUCTURE" });
  });

  it("requires exactly one description or description hash", () => {
    expect(parseInvoiceMetadata(fakeInvoice({ includeDescription: false }))).toMatchObject({
      ok: false,
      code: "INVALID_STRUCTURE"
    });
    expect(
      parseInvoiceMetadata(fakeInvoice({ descriptionHashWords: Array<number>(52).fill(2) }))
    ).toMatchObject({ ok: false, code: "INVALID_STRUCTURE" });
    expect(
      parseInvoiceMetadata(
        fakeInvoice({ includeDescription: false, descriptionHashWords: Array<number>(51).fill(2) })
      )
    ).toMatchObject({ ok: false, code: "INVALID_STRUCTURE" });
  });

  it("rejects duplicate singleton expiry fields", () => {
    expect(
      parseInvoiceMetadata(
        fakeInvoice({ expiry: 90, extraFields: [{ tag: "x", words: [1] }] })
      )
    ).toMatchObject({ ok: false, code: "INVALID_STRUCTURE" });
  });

  it.each([
    ["1m", 100_000_000n],
    ["1u", 100_000n],
    ["1n", 100n],
    ["10p", 1n]
  ])("decodes the %s multiplier exactly", (amountHrp, expectedMsat) => {
    expect(parseInvoiceMetadata(fakeInvoice({ amountHrp }), { now: 1_700_000_001 })).toMatchObject({
      ok: true,
      amountMsat: expectedMsat
    });
  });
});
