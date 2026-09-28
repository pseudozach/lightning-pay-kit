import { bech32 } from "@scure/base";

const wordsForInteger = (value: number, width: number): number[] => {
  const words = Array<number>(width).fill(0);
  let remaining = value;
  for (let index = width - 1; index >= 0; index -= 1) {
    words[index] = remaining & 31;
    remaining = Math.floor(remaining / 32);
  }
  return words;
};

const tagged = (tag: string, words: number[]): number[] => {
  const charset = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  const code = charset.indexOf(tag);
  return [code, Math.floor(words.length / 32), words.length % 32, ...words];
};

export function fakeInvoice(options: {
  amountHrp?: string;
  createdAt?: number;
  expiry?: number;
  expiryWords?: number[];
  paymentHashWords?: number[];
  paymentSecretWords?: number[];
  description?: string;
  includeDescription?: boolean;
  descriptionHashWords?: number[];
  extraFields?: Array<{ tag: string; words: number[] }>;
  network?: "bc" | "tb" | "tbs" | "bcrt";
} = {}): string {
  const createdAt = options.createdAt ?? 1_700_000_000;
  const description = options.description ?? "Synthetic test invoice";
  const data = [
    ...wordsForInteger(createdAt, 7),
    ...tagged("p", options.paymentHashWords ?? Array<number>(52).fill(0)),
    ...tagged("s", options.paymentSecretWords ?? Array<number>(52).fill(1)),
    ...(options.includeDescription === false
      ? []
      : tagged("d", bech32.toWords(new TextEncoder().encode(description)))),
    ...(options.descriptionHashWords === undefined ? [] : tagged("h", options.descriptionHashWords)),
    ...(options.expiryWords !== undefined
      ? tagged("x", options.expiryWords)
      : options.expiry === undefined
        ? []
        : tagged("x", wordsForInteger(options.expiry, 3))),
    ...(options.extraFields ?? []).flatMap(({ tag, words }) => tagged(tag, words)),
    ...Array<number>(104).fill(0)
  ];
  return bech32.encode(
    `ln${options.network ?? "bc"}${options.amountHrp ?? "10u"}`,
    data,
    16_384
  );
}
