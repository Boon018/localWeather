import { state, DEFAULT, settings } from "./app/state.js";
import { render } from "./app/navigation.js";
import { selectLocation, gps } from "./app/location.js";
import { Store } from "./storage/storage.js";
import { $, key, dateKey, esc } from "./ui/format.js";
import { cacheReport, cacheDiagnostics, validCache } from "./storage/cache.js";
import { compareHistory, cachedHistory } from "./weather/history.js";
import { radar, radarImages, normalizeRadar } from "./radar/legacy.js";
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
  location.protocol === "https:" &&
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
  render, esc,
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

// v1.2 radar interaction hardening. This layer deliberately wraps the existing
// renderer so the proven forecast/storage code remains unchanged during the
// migration. It adds pinch zoom, cursor-centred zoom, playback and opacity.
(function () {
  const api = window.Alpen;
  if (!api || !api.state) return;
  const MIN_Z = 5,
    MAX_Z = 10;
  const world = (lat, lon, z) => {
    const n = 2 ** z,
      r = (Math.max(-85.0511, Math.min(85.0511, Number(lat))) * Math.PI) / 180;
    return {
      x: ((Number(lon) + 180) / 360) * n * 256,
      y: ((1 - Math.asinh(Math.tan(r)) / Math.PI) / 2) * n * 256,
    };
  };
  const sizeOf = (s) => s.clientWidth || 512;
  function zoomAt(map, box, clientX, clientY, next) {
    const size = sizeOf(box),
      rect = box.getBoundingClientRect(),
      px = clientX - rect.left,
      py = clientY - rect.top;
    const old = world(
        api.state.location.latitude,
        api.state.location.longitude,
        map.z,
      ),
      oldView = { x: old.x - map.panX, y: old.y - map.panY };
    const wx = oldView.x + px - size / 2,
      wy = oldView.y + py - size / 2,
      nz = Math.max(MIN_Z, Math.min(MAX_Z, next));
    if (nz === map.z) return;
    const scale = 2 ** (nz - map.z),
      center = world(
        api.state.location.latitude,
        api.state.location.longitude,
        nz,
      );
    map.z = nz;
    map.panX = center.x - (wx * scale - px + size / 2);
    map.panY = center.y - (wy * scale - py + size / 2);
    api.radarImages();
  }
  function ensureControls(box, surface) {
    const parent = box.parentElement;
    if (!parent) return;
    let controls = parent.querySelector(".radar-controls");
    if (!controls) {
      controls = document.createElement("div");
      controls.className = "radar-controls actions";
      controls.style.marginTop = "10px";
      controls.innerHTML =
        '<button type="button" class="radar-play" aria-pressed="false">▶ Play</button><label class="radar-opacity" style="flex:1;min-width:170px">Overlay opacity <input type="range" min="0" max="100" value="76" class="range" aria-label="Radar overlay opacity"></label>';
      box.after(controls);
      const play = controls.querySelector(".radar-play");
      let timer = null;
      play.onclick = () => {
        const s = api.state;
        if (timer) {
          clearInterval(timer);
          timer = null;
          play.textContent = "▶ Play";
          play.setAttribute("aria-pressed", "false");
          return;
        }
        play.textContent = "❚❚ Pause";
        play.setAttribute("aria-pressed", "true");
        timer = setInterval(() => {
          if (!s.radar?.frames?.length) {
            clearInterval(timer);
            timer = null;
            return;
          }
          s.radarIndex = (s.radarIndex + 1) % s.radar.frames.length;
          api.radarImages();
        }, 900);
      };
      controls.querySelector("input").oninput = (e) => {
        const layer = surface.querySelector(".radar-tiles");
        if (layer) layer.style.opacity = String(Number(e.target.value) / 100);
      };
    }
  }
  function enhance(surface) {
    if (surface.dataset.v12Enhanced === "1") return;
    surface.dataset.v12Enhanced = "1";
    let pointers = new Map(),
      drag = null;
    const map = api.state.radarMap;
    const render = () => api.radarImages();
    surface.onpointerdown = (e) => {
      if (e.target.closest("button")) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      surface.setPointerCapture?.(e.pointerId);
      if (pointers.size === 1) {
        drag = { x: e.clientX, y: e.clientY, px: map.panX, py: map.panY };
        surface.classList.add("dragging");
      } else drag = null;
    };
    surface.onpointermove = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const pts = [...pointers.values()],
          a = pts[0],
          b = pts[1],
          mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (!surface._pinch) {
          surface._pinch = { distance, zoom: map.z };
          return;
        }
        const delta = distance / surface._pinch.distance;
        if (Math.abs(delta - 1) > 0.015) {
          const next = surface._pinch.zoom + (delta > 1 ? 1 : -1);
          zoomAt(map, surface, mid.x, mid.y, next);
          surface._pinch = { distance, zoom: map.z };
        }
        return;
      }
      if (drag) {
        map.panX = drag.px + e.clientX - drag.x;
        map.panY = drag.py + e.clientY - drag.y;
        render();
      }
    };
    surface.onpointerup = surface.onpointercancel = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) surface._pinch = null;
      if (!pointers.size) {
        drag = null;
        surface.classList.remove("dragging");
      }
    };
    surface.onwheel = (e) => {
      e.preventDefault();
      zoomAt(
        map,
        surface,
        e.clientX,
        e.clientY,
        map.z + (e.deltaY < 0 ? 1 : -1),
      );
    };
    const buttons = surface.querySelectorAll(".map-tools button");
    if (buttons[0])
      buttons[0].onclick = () => {
        map.z = Math.max(MIN_Z, map.z - 1);
        render();
      };
    if (buttons[1])
      buttons[1].onclick = () => {
        map.z = Math.min(MAX_Z, map.z + 1);
        render();
      };
    if (buttons[2])
      buttons[2].onclick = () => {
        map.panX = 0;
        map.panY = 0;
        render();
      };
    ensureControls(surface.closest(".radarbox"), surface);
  }
  const observer = new MutationObserver(() => {
    const surface = document.querySelector(".map-surface");
    if (surface) {
      enhance(surface);
      ensureControls(surface.closest(".radarbox"), surface);
    }
  });
  observer.observe(document.getElementById("main") || document.body, {
    subtree: true,
    childList: true,
  });
})();
