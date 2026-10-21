# Alpenwetter v1.2

## Recovery points

- Original interactive map: `077411a`.
- Public v1.2.0: `15e101c` (local recovery tag `recovery/v1.2.0`).
- Modular extraction: `28daa2c`, on `release/v1.2`, pending browser gates.

`src/` is authoritative. `index.html`, `dist/index.html` and
`dist/standalone.html` are generated; do not edit them. Build with `npm ci`
and `npm run build`. End users need no tools. The bundle includes all JavaScript
and CSS and does not load a runtime framework or CDN script.

Run `npm test`, `npm run check:artifact`, then `npm run test:browser`.
Install test engines with `npx playwright install --with-deps chromium webkit`.
Browser tests use deterministic weather/location/tile fixtures. Live-provider
checks and physical iOS testing are separate from CI.

## Storage compatibility

No schema or namespace migration. All keys keep the prefix `alpen.v1.`.
Coordinate suffixes remain latitude/longitude rounded to three decimal places.

| Key | Value |
| --- | --- |
| settings | theme, temperature, wind, precipitation, refresh, defaultLocation |
| location | name, latitude, longitude, country, timezone |
| favorites | array of locations |
| forecast:lat,lon | savedAt, location, timezone, current, astro, base, models, rows, failures |
| history:lat,lon:YYYY-MM-DD | savedAt, date, timezone, hourly rows |
| warnings:lat,lon | savedAt, name, warnings |
| snapshots:lat,lon | array of bucket, issued, models with hourly rows |
| scores:lat,lon | savedAt, model error totals/sample counts |
| persistenceProbe | startup diagnostic marker; not personal data |

Malformed values must be ignored in memory without deleting the stored original.
Quota failures retain usable data in memory. Clearing personal data is an explicit
user action only. Tests include a representative legacy storage fixture.

## Deployment and rollback

The Pages workflow builds and tests before uploading `dist/`. All URLs are
relative to `/localWeather/`; the origin and public address remain unchanged.
Work proceeds on a feature branch and only a passing commit is promoted to main.

To roll back, revert the affected release commit(s) on main and rerun the Pages
workflow. Do not rewrite history or clear browser localStorage. The optional
service worker uses a build-specific shell cache; weather and tiles are never
stored by the service worker. A normal online navigation uses the network first.
The original standalone app can always be recovered from the commits above.

## Device acceptance

1. Open the Pages URL and check the version.
2. Search Graz; load radar; verify the city and marker agree.
3. Pan in all directions, pinch, zoom with buttons, then recenter.
4. Select Vienna, return to radar, and verify its center.
5. Play/pause and scrub the timeline. Check timestamps and opacity.
6. Navigate away and back; confirm playback stopped.
7. Rotate iPad; verify map size and touch targets. Use desktop wheel/drag.
8. Save a favorite and reload; confirm it survives.
9. Disable internet and refresh an already loaded forecast; cached weather remains.
   Reloading the app itself offline requires a previously installed PWA shell.

Failure report: device/browser, version, location, action, expected/actual,
and a screenshot. Automated WebKit is not a physical iPhone test.
