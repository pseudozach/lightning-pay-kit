import React from "react";
import ReactDOM from "react-dom/client";
import { LightningPaymentHelp } from "lightning-pay-kit";
import "lightning-pay-kit/styles.css";
import "./playground.css";

// Synthetic regtest-format fixture with a fake signature. It cannot be paid.
const invoice = "lnbcrt25u1pmnt9qqpp5qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqsp5ppppppppppppppppppppppppppppppppppppppppppppppppppppdzq2dx4xdznv968xgryv4kk7gpdypehjmn5dpjhg6tr9ssxuetkv4ezqurp09skymr9xqrrssqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqn3n0v0";

export function App() {
  return (
    <main>
      <nav aria-label="Playground navigation" className="site-nav">
        <a className="brand" href="#top">
          <span aria-hidden="true" className="brand-mark">ϟ</span>
          Lightning Pay Kit
        </a>
        <span className="version">v0.1 preview</span>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="kicker">A small answer to a common question</p>
          <h1>How can I pay this <em>invoice?</em></h1>
          <p className="lede">
            A lightweight React helper for honest Lightning handoffs—one canonical wallet action,
            local QR and copy, plus a searchable directory of places to continue.
          </p>
          <div className="principles" aria-label="Product principles">
            <span>No connections</span>
            <span>No telemetry</span>
            <span>No false success</span>
          </div>
        </div>

        <article className="invoice-card" aria-label="Synthetic invoice example">
          <div className="invoice-card-topline">
            <span>SMS4Sats</span>
            <span className="fake-label">Synthetic fixture</span>
          </div>
          <p className="invoice-purpose">Send a text message</p>
          <div className="amount-row">
            <strong>2,500</strong>
            <span>sats</span>
          </div>
          <div className="invoice-preview">{invoice.slice(0, 26)}…{invoice.slice(-12)}</div>
          <div className="help-row">
            <div>
              <strong>Need help paying?</strong>
              <span>Browse wallets, apps, exchanges and fallbacks.</span>
            </div>
            <LightningPaymentHelp invoice={invoice} now={2_000_000_001} />
          </div>
        </article>
      </section>

      <section className="integration" aria-labelledby="integration-title">
        <div>
          <p className="kicker">SMS4Sats-ready</p>
          <h2 id="integration-title">Pass the invoice you already have.</h2>
          <p>
            No provider setup, browser globals at import time, or framework server API. Import the
            static stylesheet once and place the compact helper beside the existing invoice UI.
          </p>
        </div>
        <pre aria-label="SMS4Sats React integration example"><code>{`import { LightningPaymentHelp } from "lightning-pay-kit";
import "lightning-pay-kit/styles.css";

<LightningPaymentHelp
  invoice={invoice}
  trigger="button"
/>`}</code></pre>
      </section>

      <footer>
        <span>Local demo only. No payment or app is launched automatically.</span>
        <span>MIT source · Provider marks excluded</span>
      </footer>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Playground root element is missing.");
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
