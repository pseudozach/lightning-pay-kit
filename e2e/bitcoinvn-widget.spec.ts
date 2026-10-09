import { expect, test } from "@playwright/test";

test("BitcoinVN widget is explicit opt-in and authenticates bounded resize messages", async ({ page }) => {
  let requests = 0;
  await page.route("https://bitcoinvn.io/embed/swap?*", async route => {
    requests += 1;
    await route.fulfill({ contentType: "text/html", body: '<!doctype html><title>Widget fixture</title><p>Read-only widget fixture</p><script>parent.postMessage({type:"chadshift-embed-resize",height:640},"*")</script>' });
  });
  await page.goto("/lightning-pay-kit/");
  await page.getByRole("button", { name: "How to pay this invoice", exact: true }).click();
  await page.getByRole("searchbox").fill("BitcoinVN");
  expect(requests).toBe(0);
  const link = page.getByRole("link", { name: /BitcoinVN/ });
  expect(new URL((await link.getAttribute("href"))!).searchParams.get("ref")).toBe("efd36219af705e28");
  await link.click();
  const iframe = page.getByTitle("BitcoinVN exchange widget", { exact: true });
  await expect(iframe).toHaveAttribute("src", "https://bitcoinvn.io/embed/swap?settle=btcln&ref=efd36219af705e28");
  await expect(iframe).toHaveCSS("height", "640px");
  expect(requests).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new MessageEvent("message", { origin: "https://bitcoinvn.io", source: window, data: { type: "chadshift-embed-resize", height: 999 } })));
  await expect(iframe).toHaveCSS("height", "640px");
  const frame = page.frames().find(item => item.url().startsWith("https://bitcoinvn.io/embed/swap?settle=btcln"));
  expect(frame).toBeDefined();
  await frame!.evaluate(() => parent.postMessage({ type: "chadshift-embed-resize", height: 20000 }, "*"));
  await expect(iframe).toHaveCSS("height", "10000px");
  await frame!.evaluate(() => parent.postMessage({ type: "chadshift-embed-resize", height: Infinity }, "*"));
  await expect(iframe).toHaveCSS("height", "10000px");
  await page.getByRole("button", { name: "Close BitcoinVN exchange widget", exact: true }).click();
  await expect(iframe).toHaveCount(0);
});
