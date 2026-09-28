import {
  applyAffiliateOverrides,
  createHandoffEvent,
  createLightningUri,
  defaultProviders,
  filterProviders,
  parseInvoiceMetadata,
  type AffiliateOverrides,
  type HandoffEvent,
  type PaymentProvider
} from "@lightning-pay-kit/core";
import { QRCodeSVG } from "qrcode.react";
import { createPortal } from "react-dom";
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement
} from "react";

const categories = [
  ["all", "All"],
  ["wallet", "Wallets"],
  ["payment_app", "Payment apps"],
  ["exchange", "Exchanges"],
  ["swap", "Swaps"]
] as const;

type Category = (typeof categories)[number][0];

let activeScrollLocks = 0;
let bodyInitiallyHadScrollLock = false;

function acquireScrollLock(): () => void {
  if (activeScrollLocks === 0) {
    bodyInitiallyHadScrollLock = document.body.classList.contains("lpk-scroll-lock");
    document.body.classList.add("lpk-scroll-lock");
  }
  activeScrollLocks += 1;
  return () => {
    activeScrollLocks = Math.max(0, activeScrollLocks - 1);
    if (activeScrollLocks === 0 && !bodyInitiallyHadScrollLock) {
      document.body.classList.remove("lpk-scroll-lock");
    }
  };
}

export interface LightningPaymentModalProps {
  readonly invoice: string;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly providers?: readonly PaymentProvider[];
  readonly affiliateOverrides?: AffiliateOverrides;
  readonly onHandoff?: (event: HandoffEvent) => void;
  readonly now?: number;
  readonly title?: string;
}

function safeDescription(value: string | null): string | null {
  if (!value) return null;
  const safeCharacters = Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    const isControl = codePoint <= 31 || (codePoint >= 127 && codePoint <= 159);
    const isBidiControl =
      (codePoint >= 0x202a && codePoint <= 0x202e) ||
      (codePoint >= 0x2066 && codePoint <= 0x2069);
    return isControl || isBidiControl ? " " : character;
  }).join("");
  return safeCharacters
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function formatAmount(amountMsat: bigint | null): string {
  if (amountMsat === null) return "Amount chosen in wallet";
  if (amountMsat % 1_000n === 0n) {
    return `${(amountMsat / 1_000n).toLocaleString("en-US")} sats`;
  }
  return `${amountMsat.toLocaleString("en-US")} msat`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute("hidden"));
}

export function LightningPaymentModal({
  invoice,
  isOpen,
  onClose,
  providers = defaultProviders,
  affiliateOverrides = {},
  onHandoff,
  now,
  title = "How can I pay?"
}: LightningPaymentModalProps): ReactElement | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [copyStatus, setCopyStatus] = useState("");
  const [canUsePortal, setCanUsePortal] = useState(false);

  useEffect(() => {
    setCanUsePortal(true);
  }, []);

  const metadata = useMemo(
    () => parseInvoiceMetadata(invoice, now === undefined ? {} : { now }),
    [invoice, now]
  );
  const visibleProviders = useMemo(
    () =>
      applyAffiliateOverrides(
        filterProviders(providers, {
          query,
          category
        }),
        affiliateOverrides
      ),
    [affiliateOverrides, category, providers, query]
  );

  useEffect(() => {
    if (!isOpen || !canUsePortal) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const backdrop = dialog?.closest(".lpk-backdrop");
    const backgroundElements = Array.from(document.body.children).filter(
      (element): element is HTMLElement => element instanceof HTMLElement && element !== backdrop
    );
    const backgroundState = backgroundElements.map((element) => ({
      element,
      inert: element.inert,
      ariaHidden: element.getAttribute("aria-hidden")
    }));
    const releaseScrollLock = acquireScrollLock();
    for (const element of backgroundElements) {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    }
    dialog?.querySelector<HTMLElement>("[data-lpk-initial-focus]")?.focus();
    return () => {
      for (const { element, inert, ariaHidden } of backgroundState) {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      }
      releaseScrollLock();
      previousFocusRef.current?.focus();
    };
  }, [canUsePortal, isOpen]);

  useEffect(() => {
    if (isOpen) return;
    setQuery("");
    setCategory("all");
    setCopyStatus("");
  }, [isOpen]);

  if (!isOpen || !canUsePortal) return null;

  const canHandoff = metadata.ok && !metadata.expired;
  const normalizedInvoice = metadata.ok ? metadata.invoice : null;
  const lightningUri = canHandoff && normalizedInvoice ? createLightningUri(normalizedInvoice) : null;

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = focusableElements(dialogRef.current);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  const handleBackdrop = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  const copyInvoice = async () => {
    if (!normalizedInvoice) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(normalizedInvoice);
      setCopyStatus("Invoice copied. Opening or copying does not confirm payment.");
      onHandoff?.(createHandoffEvent("copy"));
    } catch {
      setCopyStatus("Copy unavailable. Select the invoice text below.");
    }
  };

  const copyForProvider = (providerId: string) => {
    if (normalizedInvoice && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(normalizedInvoice).then(
        () => setCopyStatus("Invoice copied. The provider page was opened in a new tab."),
        () => setCopyStatus("Invoice was not copied. Return here and use manual copy.")
      );
    } else {
      setCopyStatus("Invoice was not copied. Return here and use manual copy.");
    }
    onHandoff?.(createHandoffEvent("provider_https", providerId));
  };

  const modal = (
    <div className="lpk-backdrop" onMouseDown={handleBackdrop}>
      <div
        aria-label={title}
        aria-modal="true"
        className="lpk-dialog"
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
      >
        <header className="lpk-header">
          <div>
            <p className="lpk-eyebrow">Lightning payment help</p>
            <h2>{title}</h2>
          </div>
          <button
            aria-label="Close payment help"
            className="lpk-close"
            data-lpk-initial-focus
            onClick={onClose}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <p className="lpk-explainer">
          Choose a handoff method. Your wallet must validate the invoice; this page cannot detect installed wallets or confirm that a payment succeeded.
        </p>

        {!metadata.ok ? (
          <div className="lpk-error" role="alert">
            <strong>Invoice unavailable</strong>
            <span>{metadata.message}</span>
          </div>
        ) : (
          <>
            <section aria-label="Invoice summary" className="lpk-summary">
              <div>
                <span className="lpk-summary-label">Amount</span>
                <strong>{formatAmount(metadata.amountMsat)}</strong>
              </div>
              <div>
                <span className="lpk-summary-label">Network</span>
                <strong>{metadata.network}</strong>
              </div>
              <div>
                <span className="lpk-summary-label">Status</span>
                <strong className={metadata.expired ? "lpk-danger-text" : undefined}>
                  {metadata.expired ? "Expired" : "Handoff available"}
                </strong>
              </div>
              {safeDescription(metadata.description) ? (
                <div className="lpk-summary-description">
                  <span className="lpk-summary-label">Memo</span>
                  <bdi>{safeDescription(metadata.description)}</bdi>
                </div>
              ) : null}
            </section>

            {metadata.expired ? (
              <div className="lpk-error" role="alert">
                <strong>This invoice has expired</strong>
                <span>Request a fresh invoice before trying to pay.</span>
              </div>
            ) : null}

            <section aria-label="Payment handoff choices" className="lpk-primary-actions">
              {lightningUri ? (
                <a
                  className="lpk-primary-button"
                  href={lightningUri}
                  onClick={() => onHandoff?.(createHandoffEvent("lightning_uri"))}
                >
                  <span className="lpk-bolt" aria-hidden="true">ϟ</span>
                  Open Lightning wallet
                </a>
              ) : null}
              <button className="lpk-secondary-button" disabled={!canHandoff} onClick={() => void copyInvoice()} type="button">
                Copy invoice
              </button>
            </section>

            <div aria-live="polite" className="lpk-status" role="status">
              {copyStatus}
            </div>

            <details className="lpk-manual" open>
              <summary>QR and manual copy</summary>
              <div className="lpk-manual-content">
                {canHandoff && normalizedInvoice ? (
                  <div className="lpk-qr" aria-label="Lightning invoice QR code">
                    <QRCodeSVG
                      bgColor="transparent"
                      fgColor="currentColor"
                      level="M"
                      marginSize={1}
                      size={152}
                      title="Lightning invoice QR code"
                      value={`LIGHTNING:${normalizedInvoice.toUpperCase()}`}
                    />
                  </div>
                ) : null}
                <label className="lpk-invoice-label">
                  <span>Lightning invoice text</span>
                  <textarea
                    aria-label="Lightning invoice text"
                    onFocus={(event) => event.currentTarget.select()}
                    readOnly
                    rows={3}
                    value={normalizedInvoice ?? invoice}
                  />
                </label>
              </div>
            </details>

            {canHandoff ? (
              <section aria-label="Where to continue" className="lpk-directory">
                <div className="lpk-directory-heading">
                  <div>
                    <p className="lpk-eyebrow">Provider directory</p>
                    <h3>Where to continue</h3>
                  </div>
                  <label className="lpk-search">
                    <span className="lpk-sr-only">Search payment providers</span>
                    <input
                      aria-label="Search payment providers"
                      onChange={(event) => setQuery(event.currentTarget.value)}
                      placeholder="Search wallets, apps, exchanges…"
                      type="search"
                      value={query}
                    />
                  </label>
                </div>

                <div aria-label="Provider categories" className="lpk-categories">
                  {categories.map(([value, label]) => (
                    <button
                      aria-pressed={category === value}
                      className={category === value ? "lpk-chip lpk-chip-active" : "lpk-chip"}
                      key={value}
                      onClick={() => setCategory(value)}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {visibleProviders.length === 0 ? (
                  <p className="lpk-empty">No verified providers match this search. QR and copy remain available.</p>
                ) : (
                  <ul className="lpk-provider-grid">
                    {visibleProviders.map((provider) => (
                      <li key={provider.id}>
                        <a
                          className="lpk-provider"
                          href={provider.destinationUrl}
                          onClick={() => copyForProvider(provider.id)}
                          rel={
                            provider.affiliateDisclosure
                              ? "sponsored noopener noreferrer"
                              : "noopener noreferrer"
                          }
                          target="_blank"
                        >
                          <span aria-hidden="true" className="lpk-provider-mark">
                            {initials(provider.name)}
                          </span>
                          <span className="lpk-provider-copy">
                            <span className="lpk-provider-title">
                              <strong>{provider.name}</strong>
                              {provider.serviceStatus === "maintenance" ? (
                                <span className="lpk-badge lpk-badge-warning">Maintenance</span>
                              ) : null}
                              {provider.affiliateDisclosure ? (
                                <span className="lpk-badge">{provider.affiliateDisclosure}</span>
                              ) : null}
                            </span>
                            <span>{provider.action.label}</span>
                            <small>
                              {provider.custody.replace("_", " ")}
                              {provider.accountRequired ? " · Account required" : ""}
                            </small>
                          </span>
                          <span aria-hidden="true" className="lpk-arrow">↗</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
  return createPortal(modal, document.body);
}
