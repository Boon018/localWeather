const point = {
  name: "Graz",
  latitude: 47.0707,
  longitude: 15.4395,
  timezone: "Europe/Vienna",
};
const time = Math.floor(Date.now() / 3600000) * 3600;
function forecast() {
  return {
    timezone: "Europe/Vienna",
    current: { time, temperature_2m: 12, weather_code: 61 },
    hourly: {
      time: Array.from({ length: 384 }, (_, i) => time + i * 3600),
      temperature_2m: Array(384).fill(12),
      precipitation: Array(384).fill(2.5),
      precipitation_probability: Array(384).fill(70),
      weather_code: Array(384).fill(61),
    },
  };
}
export async function providers(page) {
  await page.route("https://**/*", async (route) => {
    const u = new URL(route.request().url());
    let body;
    if (u.hostname.includes("open-meteo"))
      body = u.hostname.includes("geocoding")
        ? {
            results: [
              { name: "Vienna", latitude: 48.2082, longitude: 16.3738 },
            ],
          }
        : forecast();
    else if (u.hostname.includes("warnungen"))
      body = {
        properties: {
          warnings: [],
          location: { properties: { name: "Graz" } },
        },
      };
    else if (u.hostname === "api.rainviewer.com")
      body = {
        host: "https://tilecache.rainviewer.com",
        radar: {
          past: [0, 1, 2].map((i) => ({
            time: time - 1200 + i * 600,
            path: "/v2/radar/frame" + i,
          })),
        },
      };
    else if (u.pathname.endsWith(".png"))
      return route.fulfill({
        contentType: "image/svg+xml",
        body: `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#a2c9c8"/></svg>`,
      });
    else return route.abort();
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}
