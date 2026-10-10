import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("is usable, responsive, keyboard-safe, and accessible", async ({ page }, testInfo) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== "http://127.0.0.1:4173") externalRequests.push(request.url());
  });

  await page.goto("/lightning-pay-kit/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true);
  const trigger = page.getByRole("button", { name: "How to pay this invoice", exact: true });
  await trigger.focus();
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "How can I pay?" });
  await expect(dialog).toBeVisible();
  await expect
    .poll(async () => {
      const cards = dialog.locator(".lpk-provider");
      const cardSizes = await cards.evaluateAll((elements) =>
        elements.map((card) => ({
          height: Math.round(card.getBoundingClientRect().height),
          overflows: card.scrollHeight > card.clientHeight || card.scrollWidth > card.clientWidth,
          width: Math.round(card.getBoundingClientRect().width)
        }))
      );
      return {
        heights: new Set(cardSizes.map(({ height }) => height)).size,
        overflowCount: cardSizes.filter(({ overflows }) => overflows).length,
        widths: new Set(cardSizes.map(({ width }) => width)).size
      };
    })
    .toMatchObject({ overflowCount: 0, widths: 1 });
  const modalOverflowCount = await page.evaluate(() =>
    [document.documentElement, document.querySelector(".lpk-dialog"), document.querySelector(".lpk-provider-grid")]
      .filter((element): element is HTMLElement => element instanceof HTMLElement)
      .filter((element) => element.scrollWidth > element.clientWidth).length
  );
  expect(modalOverflowCount).toBe(0);
  await expect(page.getByRole("button", { name: "Close payment help" })).toBeFocused();
  await expect(dialog.getByRole("heading", { name: "Provider directory" })).toBeVisible();
  const search = dialog.getByRole("searchbox", { name: "Search payment providers" });
  await expect(search).toBeVisible();
  await search.fill("ACINQ");
  const clear = dialog.getByRole("button", { name: "Clear provider search" });
  await clear.focus();
  await page.keyboard.press("Enter");
  await expect(search).toHaveValue("");
  await expect(search).toBeFocused();
  await expect(dialog.getByLabel("Lightning invoice QR code")).toHaveCount(0);
  await expect(dialog.getByLabel("Lightning invoice text")).toHaveCount(0);

  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  if (testInfo.project.name === "mobile-320") {
    expect(box!.width).toBeLessThanOrEqual(320);
    expect(box!.x).toBe(0);
  } else {
    expect(box!.width).toBeLessThan(800);
    expect(box!.x).toBeGreaterThan(200);
  }

  const accessibility = await new AxeBuilder({ page }).include(".lpk-dialog").analyze();
  expect(accessibility.violations).toEqual([]);
  expect(externalRequests).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("opens and closes without strict-CSP inline-style violations", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /content security policy|style-src/i.test(message.text())) {
      violations.push(message.text());
    }
  });

  await page.goto("/lightning-pay-kit/");
  await page.evaluate(() => {
    const policy = document.createElement("meta");
    policy.httpEquiv = "Content-Security-Policy";
    policy.content = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' ws:";
    document.head.append(policy);
  });
  await page.getByRole("button", { name: "How to pay this invoice", exact: true }).click();
  await expect(page.locator("body")).toHaveClass(/lpk-scroll-lock/);
  await expect(page.locator("body")).not.toHaveAttribute("style", /overflow/);
  await page.getByRole("button", { name: "Close payment help" }).click();
  await expect(page.locator("body")).not.toHaveClass(/lpk-scroll-lock/);
  expect(violations).toEqual([]);
});

