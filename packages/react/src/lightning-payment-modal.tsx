import {
  applyAffiliateOverrides,
  createHandoffEvent,
  defaultProviders,
  filterProviders,
  getProviderRegionPresentation,
  parseInvoiceMetadata,
  type AffiliateOverrides,
  type HandoffEvent,
  type PaymentProvider
} from "@lightning-pay-kit/core";
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

const categoryLabels: Record<PaymentProvider["category"], string> = {
  exchange: "Exchange",
  payment_app: "Payment app",
  swap: "Swap",
  wallet: "Wallet"
};

const custodyLabels: Record<PaymentProvider["custody"], string> = {
  configurable: "Flexible custody",
  custodial: "Custodial",
  self_custodial: "Self-custody",
  swap_based: "Swap-based"
};

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
  const searchInputRef = useRef<HTMLInputElement>(null);
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

  const clearSearch = () => {
    setQuery("");
    searchInputRef.current?.focus();
  };

  const copyForProvider = (providerId: string) => {
    if (normalizedInvoice && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(normalizedInvoice).then(
        () => setCopyStatus(""),
        () => setCopyStatus("Invoice was not copied.")
      );
    } else {
      setCopyStatus("Invoice was not copied.");
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

        {!metadata.ok ? (
          <div className="lpk-error" role="alert">
            <strong>Invoice unavailable</strong>
            <span>{metadata.message}</span>
          </div>
        ) : metadata.expired ? (
          <div className="lpk-error" role="alert">
            <strong>This invoice has expired</strong>
            <span>Request a fresh invoice before trying to pay.</span>
          </div>
        ) : canHandoff ? (
          <>
              <section aria-label="Provider directory" className="lpk-directory">
                <div className="lpk-directory-heading">
                  <h3>Provider directory</h3>
                  <div className="lpk-search">
                    <input
                      aria-label="Search payment providers"
                      onChange={(event) => setQuery(event.currentTarget.value)}
                      placeholder="Search apps, exchanges, or country…"
                      ref={searchInputRef}
                      type="search"
                      value={query}
                    />
                    {query ? (
                      <button
                        aria-label="Clear provider search"
                        className="lpk-search-clear"
                        onClick={clearSearch}
                        type="button"
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    ) : null}
                  </div>
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
                  <p className="lpk-empty">No providers match this search.</p>
                ) : (
                  <ul aria-label="Matching payment providers" className="lpk-provider-grid">
                    {visibleProviders.map((provider) => {
                      const region = getProviderRegionPresentation(provider, query);
                      return (
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
                              <span>{provider.capabilitySummary ?? provider.action.label}</span>
                              <span className="lpk-provider-meta">
                                <small className="lpk-meta-pill">{categoryLabels[provider.category]}</small>
                                <small className="lpk-meta-pill">{custodyLabels[provider.custody]}</small>
                                <small className="lpk-meta-pill">
                                  {provider.accountRequired ? "Account" : "No account"}
                                </small>
                                {provider.kycRequired ? <small className="lpk-meta-pill">KYC</small> : null}
                                <small className="lpk-meta-pill lpk-region">{region.label}</small>
                              </span>
                            </span>
                            <span aria-hidden="true" className="lpk-arrow">↗</span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            <div aria-live="polite" className="lpk-status" role="status">
              {copyStatus}
            </div>
          </>
        ) : null}
        <footer className="lpk-footer">
          <a
            href="https://github.com/pseudozach/lightning-pay-kit"
            rel="noopener noreferrer"
            target="_blank"
          >
            Use this Bitcoin Lightning payment helper on your site <span aria-hidden="true">↗</span>
          </a>
        </footer>
      </div>
    </div>
  );
  return createPortal(modal, document.body);
}
