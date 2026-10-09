import { defaultProviders, type AffiliateOverrides, type HandoffEvent, type PaymentRoute, type PaymentProvider } from "@lightning-pay-kit/core";
import React, { type ReactElement, type ReactNode } from "react";
import { LightningPaymentModal } from "./lightning-payment-modal.js";
import { useLightningPaymentHelp } from "./use-lightning-payment-help.js";

export interface LightningPaymentHelpProps {
  readonly invoice: string;
  readonly trigger?: "icon" | "button";
  readonly providers?: readonly PaymentProvider[];
  readonly paymentRoutes?: readonly PaymentRoute[];
  readonly affiliateOverrides?: AffiliateOverrides;
  readonly onHandoff?: (event: HandoffEvent) => void;
  readonly onOpenChange?: (open: boolean) => void;
  readonly now?: number;
}

function TriggerContent({ trigger }: { readonly trigger: "icon" | "button" }): ReactNode {
  if (trigger === "button") return "How to pay this invoice";
  return <span aria-hidden="true">?</span>;
}

export function LightningPaymentHelp({
  invoice,
  trigger = "icon",
  providers = defaultProviders,
  paymentRoutes,
  affiliateOverrides,
  onHandoff,
  onOpenChange,
  now
}: LightningPaymentHelpProps): ReactElement {
  const controller = useLightningPaymentHelp(
    onOpenChange === undefined ? {} : { onOpenChange }
  );
  const modalProps = {
    invoice,
    isOpen: controller.isOpen,
    onClose: controller.close,
    providers,
    ...(paymentRoutes === undefined ? {} : { paymentRoutes }),
    ...(affiliateOverrides === undefined ? {} : { affiliateOverrides }),
    ...(onHandoff === undefined ? {} : { onHandoff }),
    ...(now === undefined ? {} : { now })
  };

  return (
    <>
      <button
        aria-expanded={controller.isOpen}
        aria-haspopup="dialog"
        aria-label={trigger === "icon" ? "How can I pay this Lightning invoice?" : "How to pay this invoice"}
        className={trigger === "icon" ? "lpk-trigger lpk-trigger-icon" : "lpk-trigger"}
        onClick={controller.open}
        type="button"
      >
        <TriggerContent trigger={trigger} />
      </button>
      <LightningPaymentModal {...modalProps} />
    </>
  );
}
