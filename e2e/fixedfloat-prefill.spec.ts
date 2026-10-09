import { expect, test } from "@playwright/test";

test("FixedFloat preserves invoice, exact output and referral from every rendered entry point", async ({ page, context }) => {
  await context.route("https://ff.io/**", route => route.fulfill({ body: "Read-only handoff capture" }));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => { throw new Error("Clipboard must not be required for prefilled links"); } } });
  });
  await page.goto("/lightning-pay-kit/");
  await page.getByRole("combobox", { name: "Preview invoice amount" }).selectOption("1000");
  await page.getByRole("button", { name: "How to pay this invoice", exact: true }).click();
  for (const query of ["", "FixedFloat", "USDT Tron"]) {
    await page.getByRole("searchbox").fill(query);
    const link = query === "USDT Tron" ? page.getByRole("link", { name: /Check limits with FixedFloat/ }) : page.locator("a.lpk-provider").filter({ hasText: "FixedFloat" });
    const url = new URL((await link.getAttribute("href"))!);
    expect(url.searchParams.get("from")).toBe("USDTTRC");
    expect(url.searchParams.get("to")).toBe("BTCLN");
    expect(url.searchParams.get("toAmount")).toBe("0.00001");
    expect(url.searchParams.get("address")).toMatch(/^lnbc10000n1/);
    expect(url.searchParams.getAll("ref")).toEqual(["pmdxabka"]);
    const [popup] = await Promise.all([page.waitForEvent("popup"), link.click()]);
    await expect(popup).toHaveURL(url.href);
    await popup.close();
    await expect(page.getByRole("status")).not.toContainText("Could not copy");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});
