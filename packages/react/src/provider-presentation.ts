import type { PaymentProvider } from "@lightning-pay-kit/core";

export const categoryLabels: Record<PaymentProvider["category"], string> = {
  wallet: "Wallet",
  payment_app: "Payment app",
  exchange: "Exchange",
  swap: "Swap"
};
