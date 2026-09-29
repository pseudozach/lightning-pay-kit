import React from "react";
import ReactDOM from "react-dom/client";
import { LightningPaymentHelp } from "lightning-pay-kit";
import "lightning-pay-kit/styles.css";
import "./playground.css";

// Synthetic regtest-format fixture with a fake signature. It cannot be paid.
const invoice = "lnbcrt25u1pj48ugqpp5qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqsp5ppppppppppppppppppppppppppppppppppppppppppppppppppppdpy2dukuargv46xjceqv3jk6meqd9h8vmmfvdjsqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm5chdv";

const repositoryUrl = "https://github.com/pseudozach/lightning-pay-kit";

export function App() {
  return (
    <main>
      <nav aria-label="Primary navigation" className="site-nav">
        <a className="brand" href="#top">
          <span aria-hidden="true" className="brand-mark">ϟ</span>
          Lightning Pay Kit
        </a>
        <div className="nav-links">
          <a href="#install">Get started</a>
          <a href={repositoryUrl}>GitHub</a>
          <span className="version">v0.1.3</span>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="kicker">Open-source Lightning payment help</p>
          <h1>Help anyone pay a <em>Lightning invoice.</em></h1>
          <p className="lede">
            A lightweight React component with a verified directory of wallets, payment apps,
            exchanges, and swaps—searchable by provider or country.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#demo">Try the component</a>
            <a className="secondary-action" href={repositoryUrl}>View on GitHub ↗</a>
          </div>
          <div className="principles" aria-label="Product principles">
            <span>No connections</span>
            <span>No telemetry</span>
            <span>No false success</span>
          </div>
        </div>

        <article className="invoice-card" id="demo" aria-label="Synthetic invoice example">
          <div className="invoice-card-topline">
            <span>Live component</span>
            <span className="fake-label">Safe synthetic invoice</span>
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
              <span>Search by wallet, exchange, or country.</span>
            </div>
            <LightningPaymentHelp invoice={invoice} now={1_700_000_001} trigger="button" />
          </div>
        </article>
      </section>

      <section className="showcase" aria-labelledby="showcase-title">
        <div className="showcase-heading">
          <p className="kicker">Provider-first by design</p>
          <h2 id="showcase-title">The shortest path from invoice to a useful option.</h2>
          <p>
            Country-aware search prioritizes local services while keeping genuinely global apps
            visible. Every card explains its Lightning mechanism and availability.
          </p>
        </div>
        <div className="screenshot-frame">
          <img
            alt="Lightning Pay Kit provider directory showing country availability"
            src={`${import.meta.env.BASE_URL}lightning-pay-kit-preview.png`}
          />
        </div>
      </section>

      <section className="integration" id="install" aria-labelledby="integration-title">
        <div>
          <p className="kicker">Get started</p>
          <h2 id="integration-title">One package. One invoice prop.</h2>
          <p>
            React 17–19 and Next.js 12 compatible. Import the static stylesheet once and place the
            helper beside the invoice you already render.
          </p>
          <pre aria-label="npm installation command"><code>npm install lightning-pay-kit</code></pre>
        </div>
        <pre aria-label="React integration example"><code>{`import { LightningPaymentHelp } from "lightning-pay-kit";
import "lightning-pay-kit/styles.css";

<LightningPaymentHelp
  invoice={invoice}
  trigger="button"
/>`}</code></pre>
      </section>

      <section className="contribute" aria-labelledby="contribute-title">
        <p className="kicker">Community maintained</p>
        <h2 id="contribute-title">Help keep the directory honest.</h2>
        <p>
          Pull requests are welcome to add, remove, verify, or improve provider records—and to
          improve the package itself. Visible payment routes require current first-party evidence.
        </p>
        <a className="secondary-action" href={`${repositoryUrl}/blob/main/CONTRIBUTING.md`}>
          Read the contribution guide ↗
        </a>
      </section>

      <footer className="site-footer">
        <span>MIT source · Provider marks excluded</span>
        <span>Built by <a href="https://pseudozach.com">pseudozach</a></span>
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
