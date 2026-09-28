import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";

const core = await import(pathToFileURL(resolve("packages/core/dist/index.js")));
const reactPackage = await import(pathToFileURL(resolve("packages/react/dist/index.js")));

const result = core.parseInvoiceMetadata("not-an-invoice");
if (result.ok || result.code !== "UNSUPPORTED_INPUT") {
  throw new Error("Core SSR import returned an unexpected normalization result.");
}

const html = renderToString(
  React.createElement(reactPackage.LightningPaymentHelp, { invoice: "not-an-invoice" })
);
if (!html.includes("How can I pay this Lightning invoice?")) {
  throw new Error("React package did not render under Node SSR.");
}

const openModalHtml = renderToString(
  React.createElement(reactPackage.LightningPaymentModal, {
    invoice: "not-an-invoice",
    isOpen: true,
    onClose() {}
  })
);
if (openModalHtml.includes('role="dialog"')) {
  throw new Error("An initially open modal rendered outside its client-side portal during SSR.");
}

console.log("SSR import/render check passed without DOM globals or portal hydration mismatch.");

