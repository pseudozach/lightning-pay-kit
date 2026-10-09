import React, { type ReactElement } from "react";
import { applyAffiliateOverrides, createPaymentRouteHandoff, type AffiliateOverrides, type PaymentRouteView } from "@lightning-pay-kit/core";

const labels: Record<PaymentRouteView["eligibility"], string> = {
  within_limits: "Meets published limits",
  below_minimum: "Below provider minimum",
  above_maximum: "Above provider maximum",
  limits_unknown: "Check provider limits",
  amount_unknown: "Choose an amount first",
  unsupported_network: "Mainnet invoices only",
  fractional_satoshi: "Whole sats required"
};
const blocked = new Set(["below_minimum", "above_maximum", "unsupported_network", "fractional_satoshi", "amount_unknown"]);
function sats(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function PaymentRouteResults({ routes, affiliateOverrides, onContinue, invoice, now }: {
  readonly invoice: string;
  readonly now?: number | undefined;
  readonly routes: readonly PaymentRouteView[];
  readonly affiliateOverrides: AffiliateOverrides;
  readonly onContinue: (providerId: string, invoicePrefilled?: boolean) => void;
}): ReactElement {
  return <section aria-label="Token payment routes" className="lpk-routes">
    <h3>Pay with {routes[0]?.route.assetSymbol ?? "your coin"}</h3>
    <p className="lpk-route-intro">Your coin → provider → this Lightning invoice. Limits are checked against the invoice amount, not your deposit. The provider confirms the final quote and fees.</p>
    <ul aria-label="Matching token routes" className="lpk-route-grid">
      {routes.map((view) => {
        const { route, eligibility, reason } = view;
        const provider = applyAffiliateOverrides([view.provider], affiliateOverrides)[0];
        if (!provider) return null;
        const isBlocked = blocked.has(eligibility);
        const handoff = createPaymentRouteHandoff(view, invoice, { affiliateOverrides, ...(now === undefined ? {} : { now }) });
        const usesPrefill = handoff.invoicePrefilled;
        return <li key={route.id}>
          <article className="lpk-route-card">
            <div className="lpk-provider-title"><strong>{provider.name}</strong>
              {provider.affiliateDisclosure ? <span className="lpk-badge">{provider.affiliateDisclosure}</span> : null}
            </div>
            <p className="lpk-route-path">{route.assetSymbol} · {route.network} → Lightning</p>
            <span className={eligibility === "within_limits" ? "lpk-badge lpk-route-fit" : "lpk-badge lpk-badge-warning"}>{labels[eligibility]}</span>
            <p className="lpk-route-reason">{reason}</p>
            {route.limits?.minimumSats ? <p className="lpk-route-limit">Minimum: {route.limits.minimumExclusive ? "more than " : ""}{sats(route.limits.minimumSats)} sats · published {route.limits.checkedAt}</p> : null}
            {route.limits?.maximumSats ? <p className="lpk-route-limit">Maximum: {sats(route.limits.maximumSats)} sats</p> : null}
            {route.notes ? <p className="lpk-route-note">{route.notes}</p> : null}
            {route.refundNote ? <p className="lpk-route-refund"><strong>Refund warning:</strong> {route.refundNote}</p> : null}
            <p className="lpk-route-details">{provider.accountRequired ? "Account required" : "No account"}{provider.kycRequired ? " · KYC required" : ""} · {route.assetSymbol} must be on {route.network}.</p>
            {usesPrefill && !isBlocked ? <p className="lpk-route-note">Invoice and exact output amount will be prefilled. Review the provider’s quote before funding.</p> : null}
            {isBlocked ? <p className="lpk-route-disabled">Not available for this invoice.</p> : <a
              className="lpk-route-continue" href={handoff.url}
              onClick={() => onContinue(provider.id, usesPrefill)} target="_blank"
              rel={provider.affiliateDisclosure ? "sponsored noopener noreferrer" : "noopener noreferrer"}
            >{eligibility === "limits_unknown" ? "Check limits with " : "Continue with "}{provider.name} ↗</a>}
          </article>
        </li>;
      })}
    </ul>
  </section>;
}
