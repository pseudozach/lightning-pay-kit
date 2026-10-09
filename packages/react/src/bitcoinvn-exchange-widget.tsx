import { applyAffiliateOverrides, createBitcoinVnEmbedUrl, defaultProviders, type AffiliateOverrides } from "@lightning-pay-kit/core";
import React, { useEffect, useRef, useState, type ReactElement } from "react";

export interface BitcoinVNExchangeWidgetProps {
  readonly affiliateOverrides?: AffiliateOverrides;
  readonly className?: string;
}

/** Explicitly mounted third-party widget; never receives the merchant invoice. */
export function BitcoinVNExchangeWidget({ affiliateOverrides = {}, className }: BitcoinVNExchangeWidgetProps): ReactElement {
  const provider = defaultProviders.find((item) => item.id === "bitcoinvn");
  if (!provider) throw new Error("BitcoinVN provider is unavailable.");
  const view = applyAffiliateOverrides([provider], affiliateOverrides)[0]!;
  const src = createBitcoinVnEmbedUrl({ affiliateOverrides });
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(400);
  useEffect(() => {
    setHeight(400);
    const resize = (event: MessageEvent<unknown>) => {
      const frame = frameRef.current;
      if (!frame?.contentWindow || event.source !== frame.contentWindow || event.origin !== "https://bitcoinvn.io") return;
      const data = event.data;
      if (!data || typeof data !== "object" || !("type" in data) || data.type !== "chadshift-embed-resize" || !("height" in data)) return;
      if (typeof data.height !== "number" || !Number.isFinite(data.height) || data.height <= 0) return;
      setHeight(Math.min(data.height, 10000));
    };
    window.addEventListener("message", resize);
    return () => window.removeEventListener("message", resize);
  }, [src]);
  return <>{view.affiliateDisclosure ? <span className="lpk-badge">{view.affiliateDisclosure}</span> : null}<iframe allow="clipboard-write" className={className} loading="lazy" ref={frameRef}
    referrerPolicy="strict-origin-when-cross-origin" src={src} style={{ border: 0, width: "100%", height }} title="BitcoinVN exchange widget" /></>;
}
