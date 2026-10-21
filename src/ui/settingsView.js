import { APP_VERSION } from "../app/version.js";
import { settings, state } from "../app/state.js";
import { wind, esc } from "./format.js";
import { Store } from "../storage/storage.js";
export function settingSelect(id, label, opts, value) {
  return (
    '<div class="setting"><label for="' +
    id +
    '">' +
    label +
    '</label><select id="' +
    id +
    '">' +
    opts
      .map(
        ([v, n]) =>
          '<option value="' +
          v +
          '" ' +
          (String(v) === String(value) ? "selected" : "") +
          ">" +
          n +
          "</option>",
      )
      .join("") +
    "</select></div>"
  );
}
export function settingsView() {
  return (
    '<h2 class="headline">Make it yours</h2><section class="card">' +
    settingSelect(
      "theme",
      "Appearance",
      [
        ["auto", "Follow iPhone"],
        ["light", "Light"],
        ["dark", "Dark"],
      ],
      settings.theme,
    ) +
    settingSelect(
      "temperature",
      "Temperature",
      [
        ["celsius", "Celsius · °C"],
        ["fahrenheit", "Fahrenheit · °F"],
      ],
      settings.temperature,
    ) +
    settingSelect(
      "wind",
      "Wind speed",
      [
        ["kmh", "km/h"],
        ["ms", "m/s"],
        ["mph", "mph"],
      ],
      settings.wind,
    ) +
    settingSelect(
      "precipitation",
      "Precipitation",
      [
        ["mm", "Millimetres"],
        ["inch", "Inches"],
      ],
      settings.precipitation,
    ) +
    settingSelect(
      "refreshSetting",
      "Refresh when app is open",
      [
        [30, "Every 30 minutes"],
        [60, "Every hour"],
        [180, "Every 3 hours"],
      ],
      settings.refresh,
    ) +
    '<div class="setting"><label>Startup location</label><p>' +
    esc(settings.defaultLocation?.name || "Last selected location") +
    '</p><div class="actions"><button data-action="default">Use ' +
    esc(state.location.name) +
    '</button><button data-action="lastLocation">Use last selected</button></div></div></section><section class="card stack"><h2>On this device</h2><button data-action="cacheTest">Check local cache</button><div id="cacheReport" role="status"></div><p>Places, settings, forecasts, historical queries and model scores stay in this browser. No analytics, advertising or app account. Weather providers receive requested coordinates and your IP address; location search receives your search text.</p><p>Cache holds eight locations and 40 historical queries. Browser storage can be evicted by iOS; export your journal if it matters to you. Private Browsing is temporary.</p><div class="actions"><button data-action="export">Export local data</button><button data-action="clearCache">Clear weather cache</button><button class="danger" data-action="clear">Erase all app data</button></div><p class="footnote">GitHub Pages serves this public app. The app has no backend. Each browser keeps its own local data. Local files may have GPS or network restrictions; use the HTTPS app for the full map.</p></section><section class="card stack"><h2>Sources & attribution</h2><p><a href="https://github.com/Boon018/localWeather" target="_blank" rel="noreferrer">Complete source code</a> · <a href="./standalone.html" download>Download standalone HTML</a></p><p><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Forecast providers: DWD ICON, ECMWF IFS and NOAA GFS. Historical reanalysis: Copernicus / ECMWF ERA5, via Open-Meteo. Location names: GeoNames via Open-Meteo.</p><p><a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">Forecast documentation</a> · <a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noreferrer">History documentation</a> · <a href="https://open-meteo.com/en/terms" target="_blank" rel="noreferrer">Free non-commercial usage terms</a></p><p><a href="https://warnungen.zamg.at/" target="_blank" rel="noreferrer">GeoSphere Austria official warnings</a>. <a href="https://www.rainviewer.com/api.html" target="_blank" rel="noreferrer">RainViewer radar</a>, personal use; loaded only when requested.</p><p class="footnote">Version ' +
    APP_VERSION +
    ' · No background tracking or learning. Cached weather is available in this browser. To cache the app shell for offline reopening, <a href="./?pwa=1">enable optional offline installation</a> while online. Your browser may later evict stored files.</p></section>'
  );
}
export function exportData() {
  const data = Object.fromEntries(Store.keys().map((k) => [k, Store.get(k)]));
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = "alpenwetter-local-data.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
