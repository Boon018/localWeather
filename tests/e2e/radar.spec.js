import { test, expect } from "@playwright/test";
import { providers } from "./fixtures.js";
test.beforeEach(async ({ page }) => providers(page));
async function open(page) {
  await page.goto("./");
  await expect(page.locator(".temperature")).toBeVisible();
  await page.getByRole("button", { name: "Load radar", exact: true }).click();
  await expect(page.locator("#radarLabel")).toContainText("Radar tiles loaded");
}
async function center(page, lat, lon) {
  const result = await page.locator(".map-surface").evaluate((el) => ({
    center: JSON.parse(el.dataset.center),
    w: el.clientWidth,
    h: el.clientHeight,
    left: parseFloat(el.querySelector(".map-marker").style.left),
    top: parseFloat(el.querySelector(".map-marker").style.top),
  }));
  expect(result.center.x).toBeCloseTo((lon + 180) / 360, 8);
  expect(result.center.y).toBeCloseTo(
    (1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2,
    8,
  );
  expect(result.left).toBeCloseTo(result.w / 2, 5);
  expect(result.top).toBeCloseTo(result.h / 2, 5);
}
test("center, pan, zoom, reuse tiles, recenter, select location and cleanup playback", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const requests = [];
  page.on("request", (req) => {
    if (req.url().includes(".png")) requests.push(req.url());
  });
  await open(page);
  await center(page, 47.0707, 15.4395);
  const surface = page.locator(".map-surface");
  await surface.scrollIntoViewIfNeeded();
  const box = await surface.boundingBox();
  const initial = await surface.getAttribute("data-center");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 90,
    box.y + box.height / 2 + 50,
    { steps: 10 },
  );
  await page.mouse.up();
  await expect(surface).not.toHaveAttribute("data-center", initial);
  const panned = await surface.getAttribute("data-center");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(surface).toHaveAttribute("data-zoom", "8");
  expect(await surface.getAttribute("data-center")).toBe(panned);
  await page.getByRole("button", { name: "Center selected location" }).click();
  await center(page, 47.0707, 15.4395);
  // Refreshing the weather does not replace tile elements or reset the viewport.
  await page
    .locator(".base-tiles img")
    .first()
    .evaluate((el) => (el.dataset.sentinel = "retained"));
  await page.locator("#refresh").click();
  await expect(page.locator(".base-tiles img").first()).toHaveAttribute(
    "data-sentinel",
    "retained",
  );
  await page.getByRole("button", { name: "▶ Play", exact: true }).click();
  await expect(page.locator("#radarTime")).toHaveValue("0", { timeout: 6000 });
  await page.locator('[data-view="hourly"]').last().click();
  const count = requests.length;
  await page.waitForTimeout(1500);
  expect(requests.length).toBe(count);
  await page.locator('[data-view="weather"]').click();
  await expect(page.locator(".radar-play")).toHaveText("▶ Play");
  await page.locator("#searchInput").fill("Vienna");
  await page.locator("#searchForm button").click();
  await page.locator('[data-search="0"]').click();
  await expect(page.locator("#radarLabel")).toContainText("Vienna");
  await center(page, 48.2082, 16.3738);
  await page.locator("#searchInput").fill("46.5, 14.25");
  await page.locator("#searchForm button").click();
  await center(page, 46.5, 14.25);
  const radarRequests = requests.filter((u) => u.includes("rainviewer"));
  expect(
    radarRequests.every((u) => Number(new URL(u).pathname.split("/")[5]) <= 7),
  ).toBe(true);
  expect(requests.length).toBeLessThan(170);
  expect(errors).toEqual([]);
});
test("pinch simulation preserves midpoint, opacity and keyboard pan work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  const surface = page.locator(".map-surface");
  await surface.scrollIntoViewIfNeeded();
  const box = await surface.boundingBox(),
    x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  const dispatch = (type, id, px) =>
    surface.dispatchEvent(type, {
      pointerId: id,
      pointerType: "touch",
      button: 0,
      clientX: px,
      clientY: y,
      bubbles: true,
    });
  await dispatch("pointerdown", 1, x - 40);
  await dispatch("pointerdown", 2, x + 40);
  await dispatch("pointermove", 1, x - 80);
  await dispatch("pointermove", 2, x + 80);
  await dispatch("pointerup", 1, x - 80);
  await dispatch("pointerup", 2, x + 80);
  await expect(surface).toHaveAttribute("data-zoom", "8");
  await center(page, 47.0707, 15.4395);
  await page.getByLabel("Radar overlay opacity").fill("35");
  await expect(page.locator(".radar-tiles")).toHaveCSS("opacity", "0.35");
  await surface.focus();
  const before = await surface.getAttribute("data-center");
  await page.keyboard.press("ArrowRight");
  await expect(surface).not.toHaveAttribute("data-center", before);
});
test("metadata and tile failures preserve the basemap", async ({ page }) => {
  await page.route("https://api.rainviewer.com/**", (route) => route.abort());
  await page.goto("./");
  await expect(page.locator(".temperature")).toBeVisible();
  await page.getByRole("button", { name: "Load radar", exact: true }).click();
  await expect(page.locator("#radarLabel")).toContainText("Radar unavailable");
  await expect(page.locator(".base-tiles img").first()).toBeVisible();
  await page.reload();
  await page.unroute("https://api.rainviewer.com/**");
  await page.route("https://tilecache.rainviewer.com/**", (route) =>
    route.abort(),
  );
  await page.getByRole("button", { name: "Load radar", exact: true }).click();
  await expect(page.locator("#radarLabel")).toContainText("partly unavailable");
  await expect(page.locator(".base-tiles img").first()).toBeVisible();
});
for (const width of [320, 768, 1024, 1440])
  test(`radar fits ${width}px and resize`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    await center(page, 47.0707, 15.4395);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await page.setViewportSize({ width: width + 100, height: 700 });
    await expect(page.locator(".map-surface")).toBeVisible();
    await expect
      .poll(async () => {
        const b = await page.locator(".map-surface").evaluate((el) => ({
          w: el.clientWidth,
          x: parseFloat(el.querySelector(".map-marker").style.left),
        }));
        return Math.abs(b.x - b.w / 2);
      })
      .toBeLessThan(1);
  });
