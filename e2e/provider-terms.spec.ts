import { expect, test } from "@playwright/test";

test("provider terms are calm, collapsed and keyboard-expandable without hiding route actions", async ({ page }) => {
  await page.goto("/lightning-pay-kit/");
  await page.getByRole("combobox", { name: "Preview invoice amount" }).selectOption("1000");
  await page.getByRole("button", { name: "How to pay this invoice", exact: true }).click();
  await page.getByRole("searchbox").fill("USDT Tron");
  const card = page.locator("article.lpk-route-card").filter({ has: page.getByText("FixedFloat", { exact: true }) });
  const details = card.locator("details");
  const summary = details.locator("summary");
  const note = details.locator("p");
  await expect(summary).toHaveText("Provider terms apply. Review fees, limits and refund conditions before depositing.");
  await expect(details).toHaveJSProperty("open", false);
  await expect(note).toBeHidden();
  await expect(page.getByText("Refund warning:", { exact: true })).toHaveCount(0);
  expect(await summary.evaluate(el => getComputedStyle(el).color)).not.toBe("rgb(255, 140, 122)");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(details).toHaveJSProperty("open", true);
  await expect(note).toBeVisible();
  await expect(note).not.toBeEmpty();
  await page.keyboard.press("Space");
  await expect(details).toHaveJSProperty("open", false);
  await expect(card.getByRole("link", { name: /Check limits with FixedFloat/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
