# Alpenwetter 1.1 — local iPhone fixes (20 October 2026)

Use the standalone `index.html` or the existing private HTTPS link. Main-screen search accepts a town/postcode or decimal `latitude, longitude` (for example `47.07, 15.44`). Saved places are selectable on the same screen. GPS remains subject to iPhone browser permissions; blocked/denied requests now give a visible fallback message and a bounded timeout.

Changes in this update:

- Hourly cards now show **both precipitation amount (mm/h or inches/h) and probability**. Daily expanded cards use the same display. The main weather metrics include hourly precipitation; hourly details identify precipitation and rain as hourly amounts. These are hourly accumulations, not instantaneous rain-rate measurements; precipitation includes snow water equivalent.
- Radar survives returning to the page and normal forecast refreshes. Fetch errors are shown inside the radar card. Image load/error handlers are installed before starting image requests; a visible timeout handles images that never finish. The coverage mask cannot completely obscure the radar. A late response from another location is discarded. An external radar-map link is always available. There is still no geographic basemap in the embedded image.
- Cache reads now prefer a newer in-memory value after a quota failure, instead of returning an older disk value. Cache clearing/retention includes memory-only entries. Invalid persisted forecasts are rejected safely.
- **Settings → Check local cache** tests actual browser disk read/write, validates the saved forecast and reports whether a marker from an earlier page session was recovered. The diagnostic bypasses the in-memory cache.

To verify on this iPhone: load a location online, run the cache check, close and reopen **the same file**, then enable Airplane Mode and tap Refresh. The saved forecast should remain, labelled offline. A renamed/copied file, Private Browsing or a different browser can use a different storage area. [Storage behavior for file URLs is browser-dependent](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

Validation: both `node tests/test.cjs` and `node tests/regressions.cjs` pass. The new suite uses isolated JavaScript sessions with shared simulated persistent storage and covers reload persistence, offline restart, refresh failures, quota overwrite, corrupt cache recovery, main-screen controls, hourly amount plus probability, radar persistence/load errors/location races and GPS fallback. Live RainViewer metadata and both image types returned HTTP 200, valid PNG bytes and CORS `*` with `Origin: null`. No live iPhone/Firefox browser session is available in this environment; on-device storage/GPS and visual verification remain necessary. An image that loads but has no precipitation colours is explicitly distinguished from a network failure.

The source bundle includes both test suites. No credentials, tokens or personal cached data are included. Optional PWA support remains opt-in.

---

# Original prototype documentation

Open the supplied private HTTPS testing link in Safari on your iPhone. Tap ⌖ for a one-time location request, or Places to search. Graz is the initial default. No developer account, API key, build, installation or weather-app login is required. The private testing host uses your existing ChatGPT access.

## Files

- `dist/index.html`: complete app, including styles and vanilla JavaScript. No runtime dependencies, fonts or scripts from CDNs.
- `dist/sw.js`, `dist/manifest.webmanifest`, `dist/icon.svg`: optional PWA support.
- `tests/test.cjs`: built-in Node regression checks, for future development only.
- `dist/alpenwetter-source.zip`: portable source bundle. The ZIP places index.html and PWA files at its root.

The HTML can run by itself in a browser that executes local HTML and permits outbound fetch. iOS Files/Quick Look is not a reliable web-app runtime; downloading HTML is not equivalent to opening an HTTPS page in Safari. Use the provided link for the immediate iPhone test. File-origin GPS and durable storage are not guaranteed. Geolocation denial has a manual-search fallback.

## Implemented

- Current model-estimated weather; feels-like, humidity, precipitation, wind/direction/gusts, pressure and cloud cover. Nearest-hour probability, visibility and UV; sunrise/sunset.
- Hourly forecast tables and touch/range-inspectable SVG charts. Missing variables show dashes or gaps, never zero substitutes.
- Up to 16 days; expanding daily rows, high/low, precipitation and wind. Long-range days explicitly marked lower confidence.
- Consensus from DWD ICON Seamless, ECMWF IFS 0.25° and NOAA GFS Seamless; per-model comparisons and transparent methodology.
- Explicit one-shot GPS, manual place search, Austrian shortcuts, favorites, startup preference. GeoSphere municipality names improve GPS labels within Austria when available.
- Device-local forecasts, settings, favorites, historical queries and forecast journal, with JSON export and clear controls.
- Historical hourly ERA5 queries since 1940; same-calendar-day comparison with the previous ten years. This is a small-sample comparison, not a climate normal or an unusualness test.
- GeoSphere official municipal warnings, including text, severity, area and validity; cached/unavailable states are distinguished from a fresh empty result.
- On-demand RainViewer recent radar and time slider, centred on the selected location, with coverage mask. This is a radar image without geographic labels or a basemap, not a fully navigable map.
- System/light/dark mode and °C/°F, km/h/m/s/mph, mm/inches.
- Local mature-forecast evaluation against ERA5 using 24–48h forecasts: temperature, precipitation, wind and pressure MAE, plus wet/dry accuracy at 0.1mm/h. These proxy scores do not change consensus weights.

## API investigation and decisions (9 September 2026)

| Source | Access / browser check | Role / limitations |
|---|---|---|
| Open-Meteo forecast | No key; live HTTP 200 and Access-Control-Allow-Origin: * with a foreign Origin header | Four independent requests: Best Match and three explicit models. All exact requested variable sets passed. Shared hosting provider remains a common failure point. |
| DWD ICON Seamless | Via Open-Meteo | Austrian short-range detail from D2, then EU and Global. D2 ~2km / 2d / 3-hour updates; EU ~7km / 5d / 3-hour updates; Global ~11km / 7.5d / 6-hour updates. Actual non-null hours, not requested array length, control participation. |
| ECMWF IFS 0.25° | Via Open-Meteo | Global medium range; a deliberate named 0.25° product, not a claim to use the native 9km endpoint. Updates follow source ingestion; no reliable run timestamp is supplied in the response. |
| NOAA GFS Seamless | Via Open-Meteo | Global 16-day extension and independent model family. Later hours are lower-confidence trends. |
| Open-Meteo geocoding | No key; live 200, CORS * | GeoNames-based town/postcode search; Austrian results sort first. No reverse-geocoding assumption. |
| Open-Meteo archive / ERA5 | No key; live 200, CORS *; 24 historical hours parsed | Reanalysis, not observations. Explicit ERA5 request, seven-day publication buffer; hourly and ten-year same-date comparison. |
| GeoSphere warning API | No key; live coordinate request 200, CORS * | Official municipal warning properties used; projected polygon geometry is not interpreted as latitude/longitude. Up to four days; updates as needed. |
| GeoSphere station/gridded data | Investigated as future observation source, not integrated or browser-certified here | Independent station validation requires choosing a suitable station, elevation/representativeness checks, and matching observation intervals. |
| RainViewer | Public metadata, location tile and coverage mask all returned 200, CORS * | Personal-use radar. Past frames only; no promise of future nowcast. Metadata drives frame selection and missing images produce an explicit error. |

Sources and licenses:

- [Open-Meteo forecast documentation](https://open-meteo.com/en/docs)
- [DWD model documentation](https://open-meteo.com/en/docs/dwd-api)
- [ECMWF documentation](https://open-meteo.com/en/docs/ecmwf-api)
- [GFS documentation](https://open-meteo.com/en/docs/gfs-api)
- [Historical weather / ERA5](https://open-meteo.com/en/docs/historical-weather-api)
- [Geocoding documentation](https://open-meteo.com/en/docs/geocoding-api)
- [Open-Meteo terms](https://open-meteo.com/en/terms): free non-commercial use, under 10,000 calls/day, 5,000/hour and 600/minute; data attribution CC BY 4.0. Providers may log IP addresses and requested coordinates. No saved app database is uploaded.
- [GeoSphere official OpenAPI](https://openapi.hub.geosphere.at/warnapi/v1/openapi.json): CC BY 4.0; `getWarningsForCoords` supplies municipality and warning properties.
- [RainViewer API](https://www.rainviewer.com/api.html) and [tile documentation](https://www.rainviewer.com/api/weather-maps-api.html): personal-use access and attribution to RainViewer.
- [Service worker secure-context requirements](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API), [WebKit service-worker implementation](https://webkit.org/blog/8090/workers-at-your-service/).

## Forecast methodology

Only explicit models vote. Best Match is auxiliary data/fallback, avoiding double-counting its underlying models. Temperature, pressure, wind speed and cloud cover use a weighted mean. Precipitation and gusts use a weighted median to reduce single-model outlier influence; this is not a statistically calibrated or independently validated method and may miss extremes.

ICON weight is 0.50 before 48h, 0.40 at 48–120h and 0.25 beyond. ECMWF is 0.30 before 48h then 0.45; GFS 0.20 then 0.30. Weights renormalize across available values. Once a model has nulls beyond its horizon, it stops contributing. Deterministic model agreement is never presented as precipitation probability.

Best Match supplies probability, icons, apparent temperature, humidity, direction, rain/snow split, visibility and UV; these can differ from consensus fields. Current conditions are a separate model estimate. Daily totals/highs/lows derive from hourly consensus, while daily probability is the maximum hourly probability, not a calibrated whole-day event probability. Missing complete precipitation coverage yields a dash for the daily total.

Forecast journal: next 48h saved at most once per six-hour bucket, 35-day retention and 36 snapshots per location. Evaluation is retrospective, bounded to the latest eight mature snapshots, and de-duplicates model/valid-time pairs in a 24–48h lead window. ERA5 is a coarse proxy, not independent ground truth. Learned weights remain off; no existing scores or claims of skill are fabricated.

## Privacy, offline behavior and later PWA

All personal app data stays in localStorage on this browser origin. Requests send only coordinates, selected dates, search text, or public radar frame information to relevant data providers. There is no app telemetry or backend. The static hosting platform necessarily serves the app and manages access to the private testing link.

Fresh forecast cache avoids repeated calls (default 30 minutes). Eight forecast locations and 40 history queries are retained; warnings have a 15-minute freshness threshold and refresh with app activity. Failed calls never replace the forecast cache. Explicit refresh can request sooner; no background tracking is used. Quota/storage errors fall back to in-memory use, with a visible warning when storage becomes unavailable.

While the page remains open, cached weather works offline. A fully closed page on the testing host is not guaranteed to reopen offline. iOS may evict browser storage; JSON export is available. There is no import UI yet.

For a future independent static HTTPS host, place the HTML and PWA files together, open `?pwa=1` once online, then use Safari Share → Add to Home Screen. The optional service worker caches only the app shell, not cross-origin weather or authentication pages. It is deliberately not enabled by default on the private testing URL. Service-worker functionality has not been browser-tested here. A production PWA should add PNG Apple touch icons, test installation/update behavior and plan cache migrations.

Reliable background observation collection, continuously adapting weights, native widgets and push alerts are not delivered. Foreground station scoring can be added without a backend; reliable scheduled execution/push generally needs further PWA/native/server work. A basemap, panning and radar animation are also future UI work, not inherently server requirements.

## Verification performed

- `node --check` passed for inline app JavaScript and service worker.
- Exact live forecast requests passed for all four sources at Graz; 384-element hourly arrays parsed. At test time non-null temperature counts were 195 ICON, 365 ECMWF, 384 GFS, confirming the need to ignore unavailable tail hours.
- Live geocoding and 2025-09-09 ERA5 historical query passed; all checked API responses returned CORS `*` for a foreign Origin header.
- GeoSphere coordinate response parsed including a real warning. RainViewer metadata, radar tile and coverage mask fetched successfully.
- Regression suite passed with live response fixtures: startup evaluation, all six HTML view render functions, normalization, weighted consensus, missing variables, one-model failure, full-provider failure/cache preservation, TTL, historical caching, storage-quota fallback, escaped external text, timezone/DST and offline caching.
- DOM/render tests use a lightweight simulated DOM, not an actual browser. Responsive CSS was reviewed for 320px widths, touch controls, scrolling and safe-area padding. This environment's static-site preview cannot provide live browser QA, so actual visual layout, Safari permission prompts, downloads, radar presentation and PWA installation still need device verification. No claim of a tested iOS browser session is made.

For future checks with Node: `node tests/test.cjs`. No Node installation is required to use the application.
