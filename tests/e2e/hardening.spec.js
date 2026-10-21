import { test, expect } from "@playwright/test";
import { providers } from "./fixtures.js";
import legacy from "../fixtures/legacy-storage.json" with { type: "json" };
import { pathToFileURL } from "node:url";
import path from "node:path";
test.beforeEach(async ({ page }) => providers(page));
test("legacy data survives real browser startup and navigation", async ({
  page,
}) => {
  await page.addInitScript((values) => {
    for (const [key, value] of Object.entries(values))
      localStorage.setItem(key, JSON.stringify(value));
  }, legacy);
  await page.goto("./");
  await expect(page.locator(".temperature")).toBeVisible();
  await page.locator('[data-view="models"]').click();
  await expect(page.locator("#scoreMessage")).toContainText("ERA5 proxy");
  const saved = await page.evaluate(
    (keys) =>
      Object.fromEntries(
        keys.map((k) => [k, JSON.parse(localStorage.getItem(k))]),
      ),
    [
      "alpen.v1.settings",
      "alpen.v1.favorites",
      "alpen.v1.scores:47.071,15.440",
      "alpen.v1.history:47.071,15.440:2025-09-09",
    ],
  );
  for (const [key, value] of Object.entries(saved))
    expect(value).toEqual(legacy[key]);
});
test("malformed persisted values do not crash views or get erased on startup", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem("alpen.v1.favorites", "null");
    localStorage.setItem("alpen.v1.location", '{"latitude":"bad"}');
    localStorage.setItem(
      "alpen.v1.settings",
      '{"refresh":0,"theme":"unknown"}',
    );
    localStorage.setItem(
      "alpen.v1.scores:47.071,15.440",
      '{"models":{"icon":null}}',
    );
  });
  await page.goto("./");
  await expect(page.locator(".temperature")).toBeVisible();
  for (const view of ["hourly", "history", "models", "locations", "settings"]) {
    await page.locator('#nav [data-view="' + view + '"]').click();
    await expect(page.locator("main")).not.toBeEmpty();
  }
  expect(
    await page.evaluate(() => localStorage.getItem("alpen.v1.favorites")),
  ).toBe("null");
  expect(errors).toEqual([]);
});
test("late forecasts, history and search cannot overwrite selected location", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator(".temperature")).toBeVisible();
  const pending = [];
  await page.route("https://api.open-meteo.com/**", async (route) => {
    if (
      new URL(route.request().url()).searchParams.get("latitude") === "48.2082"
    ) {
      pending.push(route);
      return;
    }
    await route.fallback();
  });
  await page.locator("#searchInput").fill("48.2082,16.3738");
  await page.locator("#searchForm button").click();
  await expect.poll(() => pending.length).toBe(4);
  await page.locator("#searchInput").fill("46.5,14.25");
  await page.locator("#searchForm button").click();
  await expect(page.locator(".temperature")).toBeVisible();
  for (const route of pending) await route.fallback();
  await expect
    .poll(() => page.evaluate(() => window.Alpen.state.data?.location.latitude))
    .toBe(46.5);
  let historyRoute;
  await page.route("https://archive-api.open-meteo.com/**", (route) => {
    historyRoute = route;
  });
  await page.locator('#nav [data-view="history"]').click();
  await page.locator("#historyForm button").click();
  await expect.poll(() => !!historyRoute).toBe(true);
  await page.locator('#nav [data-view="weather"]').click();
  await page.locator("#searchInput").fill("47.1,15.2");
  await page.locator("#searchForm button").click();
  await historyRoute.fallback();
  await page.locator('#nav [data-view="history"]').click();
  await expect(page.locator("main table")).toHaveCount(0);
  let searchRoute;
  await page.route("https://geocoding-api.open-meteo.com/**", (route) => {
    searchRoute = route;
  });
  await page.locator('#nav [data-view="weather"]').click();
  await page.locator("#searchInput").fill("Vienna");
  await page.locator("#searchForm button").click();
  await expect.poll(() => !!searchRoute).toBe(true);
  await page.locator('#nav [data-view="locations"]').click();
  await searchRoute.fallback();
  await expect(page.locator("#searchResults")).toBeEmpty();
});
test("GPS selection centers the map", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 48.2082, longitude: 16.3738 });
  await page.goto("./");
  await expect(page.locator(".temperature")).toBeVisible();
  await page.locator("#gps").click();
  await expect
    .poll(() => page.evaluate(() => window.Alpen.state.location.latitude))
    .toBe(48.2082);
  await page.getByRole("button", { name: "Load radar", exact: true }).click();
  await expect(page.locator("#radarLabel")).toContainText("Radar tiles loaded");
  const center = JSON.parse(
    await page.locator(".map-surface").getAttribute("data-center"),
  );
  expect(center.x).toBeCloseTo((16.3738 + 180) / 360, 8);
});
test("standalone file starts without external scripts or build tools", async ({
  page,
}) => {
  await page.goto(pathToFileURL(path.resolve("dist/standalone.html")).href);
  await expect(page.locator("#locationTitle")).toBeVisible();
  await expect(page.locator("#searchForm")).toBeVisible();
  expect(await page.locator("script[src]").count()).toBe(0);
});
test("optional PWA shell reopens offline with saved weather", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName === "webkit",
    "Playwright WebKit service-worker emulation is not physical Safari; verify PWA offline reopening on device.",
  );
  await page.goto("./?pwa=1");
  await expect(page.locator(".temperature")).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".temperature")).toBeVisible();
  await expect(page.locator("#status")).toContainText("Offline");
  await context.setOffline(false);
});
