import { expect, test } from "@playwright/test";

// Measure settled CSS geometry rather than subpixel animation transforms.
test.use({ reducedMotion: "reduce" });

test("category filters wrap without a horizontal scrollbar and leave breathing room before cards", async ({ page }) => {
  await page.goto("/lightning-pay-kit/");
  await page.getByRole("button", { name: "How to pay this invoice", exact: true }).click();
  const filters = page.getByLabel("Provider categories", { exact: true });
  const geometry = await filters.evaluate(element => {
    const cards = document.querySelector(".lpk-provider-grid")!;
    return {
      overflows: element.scrollWidth > element.clientWidth,
      gap: cards.getBoundingClientRect().top - element.getBoundingClientRect().bottom,
      heights: Array.from(element.querySelectorAll("button"), button => button.getBoundingClientRect().height)
    };
  });
  expect(geometry.overflows).toBe(false);
  expect(geometry.gap).toBeGreaterThanOrEqual(18);
  expect(geometry.heights.every(height => height >= 44)).toBe(true);
});

test("cards have a distinct priority pill and compact content-driven rows", async ({ page }, testInfo) => {
  await page.goto("/lightning-pay-kit/");
  await page.getByRole("button", { name: "How to pay this invoice", exact: true }).click();
  const cards = page.locator(".lpk-provider");
  const geometry = await cards.evaluateAll(elements => elements.map(card => {
    const box = card.getBoundingClientRect();
    const metadata = card.querySelector(".lpk-provider-meta")!;
    const primary = metadata.children[0]!;
    const secondary = metadata.children[1]!;
    return {
      top: box.top, height: box.height,
      bottomGap: box.bottom - metadata.getBoundingClientRect().bottom,
      overflows: card.scrollWidth > card.clientWidth || card.scrollHeight > card.clientHeight,
      primaryColor: getComputedStyle(primary).color,
      secondaryColor: getComputedStyle(secondary).color
    };
  }));
  expect(geometry.length).toBeGreaterThan(20);
  expect(geometry.every(card => card.primaryColor !== card.secondaryColor)).toBe(true);
  expect(geometry.every(card => !card.overflows)).toBe(true);
  if (testInfo.project.name === "mobile-320") {
    // Mobile rows must not inherit the tallest provider's height.
    expect(Math.max(...geometry.map(card => card.bottomGap))).toBeLessThanOrEqual(20);
  } else {
    for (let index = 0; index + 1 < geometry.length; index += 2) {
      expect(Math.abs(geometry[index]!.height - geometry[index + 1]!.height)).toBeLessThanOrEqual(1);
    }
  }
});
