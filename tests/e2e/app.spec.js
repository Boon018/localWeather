import { test, expect } from "@playwright/test";

import { providers } from "./fixtures.js";
test.beforeEach(async ({ page }) => providers(page));
test("weather, favorites, views, search, history and offline reload", async ({
  page,
  context,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(page.locator(".temperature")).toHaveText("12°");
  await expect(page.locator(".hourstrip").first()).toContainText("2.5 mm/h");
  await page.getByRole("button", { name: "Save place", exact: true }).click();
  await page.reload();
  await expect(page.locator("#savedLocation")).toContainText("Graz");
  await page.locator('[data-view="hourly"]').last().click();
  await expect(page.locator("table")).toContainText("Precip. / h");
  await page.locator('[data-view="models"]').click();
  await expect(
    page.getByRole("heading", { name: "Behind the forecast" }),
  ).toBeVisible();
  await page.locator('[data-view="history"]').click();
  await page.locator("#historyForm button").click();
  await expect(page.locator("table")).toBeVisible();
  await page.locator('[data-view="weather"]').click();
  await page.locator("#searchInput").fill("Vienna");
  await page.locator("#searchForm button").click();
  await page.locator('[data-search="0"]').click();
  await expect(page.locator("#locationTitle")).toHaveText("Vienna");
  // Fail only providers: a cached page shell is a separate PWA concern.
  await page.route("https://**/*", (route) => route.abort());
  await page.reload();
  await expect(page.locator(".temperature")).toHaveText("12°");
  await page.locator("#refresh").click();
  await expect(page.locator("#status")).toContainText(
    "Saved forecast retained",
  );
  expect(errors).toEqual([]);
});
for (const width of [320, 375, 390, 430, 768, 1024, 1440])
  test(`layout ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./");
    await expect(page.locator(".temperature")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    expect(overflow).toBe(false);
  });
