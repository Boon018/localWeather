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
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('link', {name:'Open in browser'})).toHaveAttribute('target','_blank');
  await expect(page.getByRole('link', {name:'Apple’s location settings guide'})).toHaveAttribute('href','https://support.apple.com/de-at/102647');
  await page.getByRole('button',{name:'Use postcode instead'}).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('#searchInput')).toBeFocused();
});
test('location help opens without requesting GPS and retry can recover',async({page})=>{
 await page.setViewportSize({width:320,height:640});
 await page.addInitScript(()=>{
   window.locationCalls=0;
   Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(ok,fail){
     window.locationCalls++;
     if(window.locationCalls===1) fail({code:1});
     else ok({coords:{latitude:47.3384,longitude:15.0178}});
   }}});
 });
 await page.goto('./?location-help=1');
 await expect(page.getByRole('dialog')).toBeVisible();
 expect(await page.evaluate(()=>window.locationCalls)).toBe(0);
 expect(await page.locator('#locationHelp').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(320);
 await page.getByRole('button',{name:'Try location again'}).click();
 await expect(page.locator('#locationHelpReason')).toHaveText('Location permission is denied.');
 await page.getByRole('button',{name:'Try location again'}).click();
 await expect(page.getByRole('dialog')).not.toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.Alpen.state.location.latitude)).toBe(47.3384);
});
