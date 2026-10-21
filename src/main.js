import { state, DEFAULT, settings } from "./app/state.js";
import { render } from "./app/navigation.js";
import { selectLocation, gps } from "./app/location.js";
import { Store } from "./storage/storage.js";
import { $, key, dateKey, esc } from "./ui/format.js";
import { cacheReport, cacheDiagnostics, validCache } from "./storage/cache.js";
import { compareHistory, cachedHistory } from "./weather/history.js";
import { radar, radarImages } from "./ui/radarView.js";
import { normalizeRadar } from "./api/rainViewer.js";
import { score, saveSnapshots } from "./weather/modelScoring.js";
import { exportData } from "./ui/settingsView.js";
import { status, updated } from "./ui/status.js";
import { loadWeather } from "./weather/forecast.js";
import { normalize } from "./weather/normalize.js";
import { consensus, weightedMedian, daily } from "./weather/consensus.js";
import { Provider } from "./api/openMeteo.js";
import { hourstrip } from "./ui/components.js";
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.view) {
    state.view = b.dataset.view;
    render();
    window.scrollTo(0, 0);
  }
  if (b.dataset.search !== undefined)
    selectLocation(state.search[+b.dataset.search]);
  if (b.dataset.fav !== undefined)
    selectLocation(Store.get("favorites", [])[+b.dataset.fav]);
  if (b.dataset.delete !== undefined) {
    const fav = Store.get("favorites", []);
    fav.splice(+b.dataset.delete, 1);
    Store.set("favorites", fav);
    render();
  }
  if (b.dataset.quick !== undefined)
    selectLocation(
      [
        { ...DEFAULT },
        {
          name: "Vienna",
          latitude: 48.2082,
          longitude: 16.3738,
          country: "Austria",
        },
        {
          name: "Salzburg",
          latitude: 47.8095,
          longitude: 13.055,
          country: "Austria",
        },
        {
          name: "Innsbruck",
          latitude: 47.2692,
          longitude: 11.4041,
          country: "Austria",
        },
      ][+b.dataset.quick],
    );
  const a = b.dataset.action;
  if (a === "gps") gps();
  if (a === "cacheTest") $("cacheReport").innerHTML = cacheReport();
  if (a === "favorite") {
    const fav = Store.get("favorites", []);
    if (!fav.some((l) => key(l) === key(state.location)))
      fav.push(state.location);
    Store.set("favorites", fav);
    render();
  }
  if (a === "compare") compareHistory();
  if (a === "radar") radar();
  if (a === "score") {
    b.disabled = true;
    score()
      .catch(() => {
        if ($("scoreMessage"))
          $("scoreMessage").textContent = "Evaluation unavailable. Try later.";
      })
      .finally(() => (b.disabled = false));
  }
  if (a === "default" || a === "lastLocation") {
    settings.defaultLocation = a === "default" ? state.location : null;
    Store.set("settings", settings);
    render();
  }
  if (a === "export") exportData();
  if (a === "clearCache") {
    Store.keys()
      .filter(
        (k) =>
          k.startsWith("forecast:") ||
          k.startsWith("history:") ||
          k.startsWith("warnings:"),
      )
      .forEach((k) => Store.remove(k));
    state.history = null;
    state.compare = null;
    status("Weather cache cleared. Current screen stays available.");
  }
  if (
    a === "clear" &&
    confirm(
      "Erase all Alpenwetter settings, locations, cached weather and local scores?",
    )
  ) {
    Store.clear();
    location.reload();
  }
});
$("gps").onclick = gps;
$("refresh").onclick = () => loadWeather(true);
window.addEventListener("offline", updated);
window.addEventListener("online", () => {
  if (!state.busy) loadWeather();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && !state.busy) loadWeather();
});
setInterval(() => {
  if (
    !document.hidden &&
    !state.busy &&
    (!state.data || Date.now() - state.data.savedAt > settings.refresh * 60000)
  )
    loadWeather();
}, 60000);
if (
  new URLSearchParams(location.search).get("pwa") === "1" &&
  (location.protocol === "https:" ||
    (window.isSecureContext && ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname))) &&
  "serviceWorker" in navigator
) {
  const link = document.createElement("link");
  link.rel = "manifest";
  link.href = "./manifest.webmanifest";
  document.head.append(link);
  navigator.serviceWorker
    .register("./sw.js")
    .catch(() =>
      status("Offline installation unavailable; core app still works.", true),
    );
}
window.Alpen = {
  render,
  esc,
  normalize,
  consensus,
  weightedMedian,
  daily,
  Store,
  Provider,
  state,
  settings,
  loadWeather,
  cachedHistory,
  dateKey,
  saveSnapshots,
  cacheDiagnostics,
  validCache,
  radar,
  gps,
  selectLocation,
  hourstrip,
  radarImages,
  normalizeRadar,
};
if (!window.__ALPEN_TEST__) loadWeather();
