import { expect, test } from "@playwright/test";

test("opening and searching make no unexpected network requests", async ({ page }) => {
  const runtimeRequests: string[] = [];
  await page.goto("/lightning-pay-kit/");
  page.on("request", (request) => runtimeRequests.push(request.url()));

  await page.getByRole("button", { name: "How to pay this invoice", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search payment providers" }).fill("Phoenix");
  await expect(page.getByText("Phoenix", { exact: true })).toBeVisible();
  expect(runtimeRequests).toEqual([]);
});

