import { bech32 } from "@scure/base";

const DEFAULT_MAX_INVOICE_BYTES = 16_384;
const SIGNATURE_WORDS = 104;
const DEFAULT_EXPIRY_SECONDS = 3_600;
const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

export type LightningNetwork = "bitcoin" | "testnet" | "signet" | "regtest";

export type InvoiceErrorCode =
  | "EMPTY"
  | "TOO_LARGE"
  | "UNSUPPORTED_INPUT"
  | "INVALID_INVOICE"
  | "UNKNOWN_NETWORK"
  | "INVALID_AMOUNT"
  | "INVALID_STRUCTURE";

export interface InvoiceMetadata {
  readonly ok: true;
  readonly invoice: string;
  readonly network: LightningNetwork;
  readonly amountMsat: bigint | null;
  readonly description: string | null;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly expired: boolean;
}

export interface InvoiceError {
  readonly ok: false;
  readonly code: InvoiceErrorCode;
  readonly message: string;
}

export type InvoiceMetadataResult = InvoiceMetadata | InvoiceError;

export interface ParseInvoiceOptions {
  readonly maxBytes?: number;
  readonly now?: number;
}

function error(code: InvoiceErrorCode, message: string): InvoiceError {
  return { ok: false, code, message };
}

function trimAsciiWhitespace(value: string): string {
  return value.replace(/^[\t\n\r ]+|[\t\n\r ]+$/g, "");
}

export function normalizeInvoice(
  input: string,
  maxBytes = DEFAULT_MAX_INVOICE_BYTES
): { ok: true; invoice: string } | InvoiceError {
  if (new TextEncoder().encode(input).byteLength > maxBytes) {
    return error("TOO_LARGE", `Invoice input exceeds ${String(maxBytes)} bytes.`);
  }

  const trimmed = trimAsciiWhitespace(input);
  if (trimmed.length === 0) {
    return error("EMPTY", "Enter a Lightning invoice.");
  }

  let invoice = trimmed;
  if (/^lightning:/i.test(invoice)) {
    invoice = invoice.slice("lightning:".length);
  } else if (!/^ln/i.test(invoice)) {
    return error("UNSUPPORTED_INPUT", "Only raw BOLT11 or lightning: input is supported.");
  }

  if (invoice.startsWith("//") || !/^ln[0-9a-z]+$/i.test(invoice)) {
    return error("UNSUPPORTED_INPUT", "The input is not a canonical Lightning invoice.");
  }

  const hasLowercase = /[a-z]/.test(invoice);
  const hasUppercase = /[A-Z]/.test(invoice);
  if (hasLowercase && hasUppercase) {
    return error("INVALID_INVOICE", "Mixed-case Bech32 invoices are invalid.");
  }

  return { ok: true, invoice: invoice.toLowerCase() };
}

export function createLightningUri(input: string): string {
  const result = normalizeInvoice(input);
  if (!result.ok) {
    throw new TypeError(result.message);
  }
  return `lightning:${result.invoice}`;
}

function readInteger(words: readonly number[]): number | null {
  let value = 0;
  for (const word of words) {
    if (value > Math.floor((Number.MAX_SAFE_INTEGER - word) / 32)) return null;
    value = value * 32 + word;
  }
  return value;
}

function parseNetworkAndAmount(
  prefix: string
): { network: LightningNetwork; amountMsat: bigint | null } | InvoiceError {
  const networkPrefixes: ReadonlyArray<readonly [string, LightningNetwork]> = [
    ["lnbcrt", "regtest"],
    ["lntbs", "signet"],
    ["lntb", "testnet"],
    ["lnbc", "bitcoin"]
  ];
  const match = networkPrefixes.find(([candidate]) => prefix.startsWith(candidate));
  if (!match) {
    return error("UNKNOWN_NETWORK", "The invoice network is not supported.");
  }

  const amountPart = prefix.slice(match[0].length);
  if (amountPart.length === 0) {
    return { network: match[1], amountMsat: null };
  }

  const amountMatch = /^(\d+)([munp]?)$/.exec(amountPart);
  if (!amountMatch?.[1]) {
    return error("INVALID_AMOUNT", "The invoice amount is malformed.");
  }

  const quantity = BigInt(amountMatch[1]);
  const multiplier = amountMatch[2] ?? "";
  let amountMsat: bigint;
  switch (multiplier) {
    case "":
      amountMsat = quantity * 100_000_000_000n;
      break;
    case "m":
      amountMsat = quantity * 100_000_000n;
      break;
    case "u":
      amountMsat = quantity * 100_000n;
      break;
    case "n":
      amountMsat = quantity * 100n;
      break;
    case "p":
      if (quantity % 10n !== 0n) {
        return error("INVALID_AMOUNT", "The invoice amount is below one millisatoshi.");
      }
      amountMsat = quantity / 10n;
      break;
    default:
      return error("INVALID_AMOUNT", "The invoice amount multiplier is unsupported.");
  }
  return { network: match[1], amountMsat };
}

function decodeDescription(words: number[]): string | null {
  try {
    const bytes = bech32.fromWords(words);
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export function parseInvoiceMetadata(
  input: string,
  options: ParseInvoiceOptions = {}
): InvoiceMetadataResult {
  const normalized = normalizeInvoice(input, options.maxBytes);
  if (!normalized.ok) return normalized;

  let decoded: { prefix: string; words: number[] };
  try {
    decoded = bech32.decode(
      normalized.invoice as `${string}1${string}`,
      options.maxBytes ?? DEFAULT_MAX_INVOICE_BYTES
    );
  } catch {
    return error("INVALID_INVOICE", "The invoice checksum or encoding is invalid.");
  }

  const networkAndAmount = parseNetworkAndAmount(decoded.prefix);
  if ("ok" in networkAndAmount) return networkAndAmount;

  if (decoded.words.length < 7 + SIGNATURE_WORDS) {
    return error("INVALID_STRUCTURE", "The invoice does not contain the required fields.");
  }

  const createdAt = readInteger(decoded.words.slice(0, 7));
  if (createdAt === null) {
    return error("INVALID_STRUCTURE", "The invoice timestamp is too large.");
  }
  const taggedEnd = decoded.words.length - SIGNATURE_WORDS;
  let cursor = 7;
  let description: string | null = null;
  let expiry = DEFAULT_EXPIRY_SECONDS;
  let paymentHashes = 0;
  let paymentSecrets = 0;
  let descriptions = 0;
  let descriptionHashes = 0;
  let expiryFields = 0;

  while (cursor < taggedEnd) {
    if (cursor + 3 > taggedEnd) {
      return error("INVALID_STRUCTURE", "A tagged invoice field is truncated.");
    }
    const type = decoded.words[cursor];
    const lengthHigh = decoded.words[cursor + 1];
    const lengthLow = decoded.words[cursor + 2];
    if (type === undefined || lengthHigh === undefined || lengthLow === undefined) {
      return error("INVALID_STRUCTURE", "A tagged invoice field is malformed.");
    }
    const length = lengthHigh * 32 + lengthLow;
    const start = cursor + 3;
    const end = start + length;
    if (end > taggedEnd) {
      return error("INVALID_STRUCTURE", "A tagged invoice field exceeds the invoice boundary.");
    }
    const value = decoded.words.slice(start, end);
    const tag = CHARSET[type];
    if (tag === "p") {
      if (value.length !== 52) {
        return error("INVALID_STRUCTURE", "The payment hash has an invalid length.");
      }
      paymentHashes += 1;
    }
    if (tag === "s") {
      if (value.length !== 52) {
        return error("INVALID_STRUCTURE", "The payment secret has an invalid length.");
      }
      paymentSecrets += 1;
    }
    if (tag === "d") {
      const decodedDescription = decodeDescription(value);
      if (decodedDescription === null) {
        return error("INVALID_STRUCTURE", "The invoice description is not valid UTF-8.");
      }
      description = decodedDescription;
      descriptions += 1;
    }
    if (tag === "h") {
      if (value.length !== 52) {
        return error("INVALID_STRUCTURE", "The description hash has an invalid length.");
      }
      descriptionHashes += 1;
    }
    if (tag === "x") {
      expiryFields += 1;
      if (expiryFields !== 1) {
        return error("INVALID_STRUCTURE", "The invoice contains duplicate expiry fields.");
      }
      const parsedExpiry = readInteger(value);
      if (value.length === 0 || parsedExpiry === null) {
        return error("INVALID_STRUCTURE", "The invoice expiry is malformed or too large.");
      }
      expiry = parsedExpiry;
    }
    cursor = end;
  }

  if (paymentHashes !== 1 || paymentSecrets !== 1) {
    return error("INVALID_STRUCTURE", "The invoice requires one payment hash and payment secret.");
  }
  if (descriptions + descriptionHashes !== 1) {
    return error("INVALID_STRUCTURE", "The invoice requires exactly one description or description hash.");
  }

  const expiresAt = createdAt + expiry;
  if (!Number.isSafeInteger(expiresAt)) {
    return error("INVALID_STRUCTURE", "The invoice expiry timestamp is too large.");
  }
  const now = options.now ?? Math.floor(Date.now() / 1_000);
  return {
    ok: true,
    invoice: normalized.invoice,
    network: networkAndAmount.network,
    amountMsat: networkAndAmount.amountMsat,
    description,
    createdAt,
    expiresAt,
    expired: now >= expiresAt
  };
}
