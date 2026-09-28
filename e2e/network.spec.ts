import { expect, test } from "@playwright/test";

test("opening and searching make no unexpected network requests", async ({ page }) => {
  const runtimeRequests: string[] = [];
  await page.goto("/");
  page.on("request", (request) => runtimeRequests.push(request.url()));

  await page.getByRole("button", { name: "How can I pay this Lightning invoice?" }).click();
  await page.getByRole("searchbox", { name: "Search payment providers" }).fill("Phoenix");
  await expect(page.getByText("Phoenix", { exact: true })).toBeVisible();
  expect(runtimeRequests).toEqual([]);
});

