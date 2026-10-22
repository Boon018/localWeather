import { test, expect } from "@playwright/test";
import { providers } from "./fixtures.js";
test.beforeEach(async ({ page }) => providers(page));
test("Austrian postcodes work with unavailable geocoding and select the correct locality", async ({
  page,
}) => {
  await page.route("https://geocoding-api.open-meteo.com/**", (r) => r.abort());
  await page.goto("./");
  for (const query of ["8770", "AT-8770", "8770 Österreich"]) {
    await page.locator("#searchInput").fill(query);
    await page.locator("#searchForm button").click();
    await expect(page.locator("#searchResults")).toContainText(
      "8770 Sankt Michael in Obersteiermark",
    );
    await expect(page.locator("#searchResults")).toContainText(
      "8770 Hinterlainsach",
    );
  }
  await page
    .locator("#searchResults button")
    .filter({ hasText: "8770 Sankt Michael in Obersteiermark" })
    .click();
  await expect(page.locator("#locationTitle")).toHaveText(
    "8770 Sankt Michael in Obersteiermark",
  );
  await expect
    .poll(() => page.evaluate(() => window.Alpen.state.location.latitude))
    .toBe(47.3384);
  for (const query of ["1010", "8010", "6020"]) {
    await page.locator("#searchInput").fill(query);
    await page.locator("#searchForm button").click();
    await expect(page.locator("#searchResults button").first()).toContainText(
      query,
    );
  }
  await page.locator("#searchInput").fill("0000");
  await page.locator("#searchForm button").click();
  await expect(page.locator("#searchMessage")).toContainText("No locations");
});
test("permission denied gives actionable PWA help in Places", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition(ok, fail) {
          fail({ code: 1 });
        },
      },
    }),
  );
  await page.goto("./?pwa=1");
  await page.locator('#nav [data-view="locations"]').click();
  await page.locator('[data-action="gps"]').click();
  await expect(page.locator("#locationMessage")).toContainText(
    "Location permission is denied",
  );
  await expect(page.locator("#locationMessage")).toContainText("Safari");
});
