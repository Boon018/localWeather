import { state } from "../app/state.js";
import { esc, time, finite, key, $ } from "../ui/format.js";
import { render } from "../app/navigation.js";
import { json } from "../api/http.js";
export function radarContent() {
  const link =
    '<p><a href="https://www.rainviewer.com/weather-radar-map-live.html" target="_blank" rel="noreferrer">Open RainViewer radar map ↗</a></p>';
  const error = state.radarError
    ? '<div class="notice warning" role="alert">' +
      esc(state.radarError) +
      "</div>"
    : "";
  if (!state.radar)
    return (
      error +
      '<p class="muted">' +
      (state.radarBusy
        ? "Fetching radar frames…"
        : "Tap Load radar to fetch recent precipitation around " +
          esc(state.location.name) +
          ".") +
      "</p>" +
      link +
      '<p class="footnote">RainViewer · Internet required. A local-file browser may block this provider; the external map remains available.</p>'
    );
  const f = state.radar.frames[state.radarIndex];
  return (
    error +
    '<div class="radarbox"><div class="gridlines"></div><img id="radarImage" alt="Precipitation radar centred on selected location" referrerpolicy="no-referrer"><img id="radarCoverage" alt="Radar coverage mask" referrerpolicy="no-referrer" style="opacity:.35"><span class="center"></span><span class="compass">N ↑</span></div><input id="radarTime" class="range" type="range" min="0" max="' +
    (state.radar.frames.length - 1) +
    '" value="' +
    state.radarIndex +
    '" aria-label="Radar time"><p id="radarLabel" class="small" role="status">Loading radar image…</p>' +
    link +
    '<p class="footnote">' +
    esc(state.location.name) +
    ' is at the centre dot; north is up. This image has no street map. Dark mask = missing coverage. A blank image can mean no detected precipitation or missing radar data; it is not an all-clear. Blue/green → yellow/red means increasing radar reflectivity. <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">RainViewer</a> · ' +
    esc(new Date(f.time * 1000).toLocaleDateString()) +
    "</p>"
  );
}
export function normalizeRadar(d) {
  const host = new URL(d.host);
  if (
    host.protocol !== "https:" ||
    !["tilecache.rainviewer.com", "tilecache.rainviewer.net"].includes(
      host.hostname,
    )
  )
    throw Error("Unexpected radar host");
  const frames = d.radar?.past?.filter(
    (f) => finite(f.time) && /^\/v2\/radar\/[\w-]+$/.test(f.path),
  );
  if (!frames?.length) throw Error("No radar frames returned");
  return { host: host.origin, frames: frames.sort((a, b) => a.time - b.time) };
}
export async function radar() {
  if (state.radarBusy) return;
  const request = ++state.radarRequest,
    l = { ...state.location };
  state.radarBusy = true;
  state.radarError = "";
  render();
  try {
    const d = normalizeRadar(
      await json("https://api.rainviewer.com/public/weather-maps.json"),
    );
    if (request !== state.radarRequest || key(l) !== key(state.location))
      return;
    state.radar = { ...d, locationKey: key(l) };
    state.radarIndex = d.frames.length - 1;
  } catch (e) {
    if (request === state.radarRequest)
      state.radarError =
        "Radar could not load (" +
        (e.name === "AbortError" ? "request timed out" : e.message) +
        "). Try Refresh or open the radar map below. Local-file browser restrictions can also block this request.";
  } finally {
    if (request === state.radarRequest) {
      state.radarBusy = false;
      if (state.view === "weather") render();
    }
  }
}
export function radarImages() {
  const img = $("radarImage"),
    mask = $("radarCoverage");
  if (!img || !mask || !state.radar) return;
  const f = state.radar.frames[state.radarIndex],
    tail =
      "/512/7/" +
      Number(state.location.latitude).toFixed(4) +
      "/" +
      Number(state.location.longitude).toFixed(4),
    url = state.radar.host + f.path + tail + "/2/1_1.png";
  if (img.dataset.url === url) return;
  img.dataset.url = url;
  let imageState = "loading",
    coverageState = "loading";
  const label = () => {
    if ($("radarImage") !== img || img.dataset.url !== url) return;
    const age = (Date.now() / 1000 - f.time) / 60;
    let message = time(f.time) + " · " + state.location.name + " · ";
    if (imageState === "error")
      message += "Radar image failed to load. Use the external map below.";
    else if (imageState === "loading") message += "Loading radar image…";
    else message += "Radar image loaded.";
    if (coverageState === "error")
      message += " Coverage mask unavailable; coverage is unknown.";
    if (age > 30)
      message += " Older frame (" + Math.round(age) + " minutes ago).";
    $("radarLabel").textContent = message;
  };
  const timer = setTimeout(() => {
    if (imageState === "loading") {
      imageState = "error";
      label();
    }
  }, 15000);
  img.onload = () => {
    clearTimeout(timer);
    imageState = "loaded";
    label();
  };
  img.onerror = () => {
    clearTimeout(timer);
    imageState = "error";
    label();
  };
  mask.onload = () => {
    coverageState = "loaded";
    label();
  };
  mask.onerror = () => {
    coverageState = "error";
    mask.style.display = "none";
    label();
  };
  label();
  img.src = url;
  mask.src = state.radar.host + "/v2/coverage/0" + tail + "/0/0_0.png";
}
export function radarBasemap(box) {
  if (!box) return;
  const size = box.clientWidth || 512,
    old = box.querySelector(".basemap");
  if (old && old.dataset.size === String(size)) return;
  if (old) old.remove();
  const z = 7,
    n = 2 ** z,
    tileSize = size / 2,
    lat = Math.max(
      -85.0511,
      Math.min(85.0511, Number(state.location.latitude)),
    ),
    lon = Number(state.location.longitude),
    rad = (lat * Math.PI) / 180,
    cx = ((lon + 180) / 360) * n,
    cy = ((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2) * n,
    layer = document.createElement("div");
  layer.className = "basemap";
  layer.dataset.size = String(size);
  layer.setAttribute("aria-label", "OpenStreetMap basemap");
  for (let ty = Math.floor(cy) - 2; ty <= Math.floor(cy) + 2; ty++)
    for (let tx = Math.floor(cx) - 2; tx <= Math.floor(cx) + 2; tx++) {
      const x = ((tx % n) + n) % n,
        y = Math.max(0, Math.min(n - 1, ty)),
        tile = document.createElement("img");
      tile.alt = "";
      tile.loading = "lazy";
      tile.decoding = "async";
      tile.referrerPolicy = "no-referrer";
      tile.src =
        "https://tile.openstreetmap.org/" + z + "/" + x + "/" + y + ".png";
      tile.style.width = tileSize + "px";
      tile.style.height = tileSize + "px";
      tile.style.left = tx * tileSize - cx * tileSize + size / 2 + "px";
      tile.style.top = ty * tileSize - cy * tileSize + size / 2 + "px";
      layer.append(tile);
    }
  box.insertBefore(layer, box.firstChild);
}
export function radarWorld(lat, lon, z) {
  const n = 2 ** z,
    r = (Math.max(-85.0511, Math.min(85.0511, Number(lat))) * Math.PI) / 180;
  return {
    x: ((Number(lon) + 180) / 360) * n * 256,
    y: ((1 - Math.asinh(Math.tan(r)) / Math.PI) / 2) * n * 256,
  };
}
export function radarTileURL(frame, z, x, y) {
  const n = 2 ** z,
    wrapped = ((x % n) + n) % n;
  if (y < 0 || y >= n) return "";
  return (
    state.radar.host +
    frame.path +
    "/256/" +
    z +
    "/" +
    wrapped +
    "/" +
    y +
    "/2/1_1.png"
  );
}
export function renderInteractiveRadar() {
  const image = $("radarImage"),
    box = image?.closest(".radarbox") || document.querySelector(".radarbox");
  if (!box || !state.radar) return;
  const locationKey = key(state.location);
  if (!state.radarMap || state.radarMap.locationKey !== locationKey)
    state.radarMap = { locationKey, z: 7, panX: 0, panY: 0 };
  let map = state.radarMap,
    surface = box.querySelector(".map-surface");
  if (!surface) {
    box.innerHTML =
      '<div class="map-surface"><div class="map-layer base-tiles"></div><div class="map-layer radar-tiles"></div><span class="map-marker"></span><span class="map-compass">N ↑</span><div class="map-tools"><button type="button" aria-label="Zoom out">−</button><button type="button" aria-label="Zoom in">+</button><button type="button" aria-label="Center selected location">⌖</button></div></div>';
    surface = box.querySelector(".map-surface");
    const tools = surface.querySelectorAll(".map-tools button");
    tools[0].onclick = (e) => {
      e.stopPropagation();
      map.z = Math.max(5, map.z - 1);
      map.panX = 0;
      map.panY = 0;
      renderInteractiveRadar();
    };
    tools[1].onclick = (e) => {
      e.stopPropagation();
      map.z = Math.min(10, map.z + 1);
      map.panX = 0;
      map.panY = 0;
      renderInteractiveRadar();
    };
    tools[2].onclick = (e) => {
      e.stopPropagation();
      map.panX = 0;
      map.panY = 0;
      renderInteractiveRadar();
    };
    let drag = null;
    surface.onpointerdown = (e) => {
      if (e.target.closest("button")) return;
      drag = { x: e.clientX, y: e.clientY, px: map.panX, py: map.panY };
      surface.classList.add("dragging");
      surface.setPointerCapture?.(e.pointerId);
    };
    surface.onpointermove = (e) => {
      if (!drag) return;
      map.panX = drag.px + e.clientX - drag.x;
      map.panY = drag.py + e.clientY - drag.y;
      renderInteractiveRadar();
    };
    surface.onpointerup = surface.onpointercancel = () => {
      drag = null;
      surface.classList.remove("dragging");
    };
    surface.onwheel = (e) => {
      e.preventDefault();
      map.z = Math.max(5, Math.min(10, map.z + (e.deltaY < 0 ? 1 : -1)));
      map.panX = 0;
      map.panY = 0;
      renderInteractiveRadar();
    };
  }
  const size = box.clientWidth || 512,
    center = radarWorld(
      state.location.latitude,
      state.location.longitude,
      map.z,
    ),
    viewX = center.x - map.panX,
    viewY = center.y - map.panY,
    topX = Math.floor(viewX / 256) - 3,
    topY = Math.floor(viewY / 256) - 3,
    base = surface.querySelector(".base-tiles"),
    radarLayer = surface.querySelector(".radar-tiles"),
    frame = state.radar.frames[state.radarIndex];
  base.innerHTML = "";
  radarLayer.innerHTML = "";
  for (let ty = topY; ty <= topY + 7; ty++)
    for (let tx = topX; tx <= topX + 7; tx++) {
      const left = tx * 256 - viewX + size / 2,
        top = ty * 256 - viewY + size / 2;
      const mapTile = document.createElement("img");
      mapTile.alt = "";
      mapTile.loading = "lazy";
      mapTile.decoding = "async";
      mapTile.referrerPolicy = "no-referrer";
      mapTile.src =
        "https://tile.openstreetmap.org/" +
        map.z +
        "/" +
        (((tx % 2 ** map.z) + 2 ** map.z) % 2 ** map.z) +
        "/" +
        ty +
        ".png";
      mapTile.style.left = left + "px";
      mapTile.style.top = top + "px";
      base.append(mapTile);
      const radarURL = radarTileURL(frame, map.z, tx, ty);
      if (radarURL) {
        const radarTile = document.createElement("img");
        radarTile.alt = "";
        radarTile.loading = "lazy";
        radarTile.decoding = "async";
        radarTile.referrerPolicy = "no-referrer";
        radarTile.src = radarURL;
        radarTile.style.left = left + "px";
        radarTile.style.top = top + "px";
        radarLayer.append(radarTile);
      }
    }
  const marker = surface.querySelector(".map-marker");
  marker.style.left = size / 2 + map.panX + "px";
  marker.style.top = size / 2 + map.panY + "px";
  const label = $("radarLabel");
  if (label)
    label.textContent =
      time(frame.time) + " · " + state.location.name + " · Radar map loaded.";
  const note = box.parentElement?.querySelector(".footnote");
  if (note)
    note.innerHTML =
      esc(state.location.name) +
      ' is initially centred at the dot. Drag to pan, use +/− to zoom, or tap ⌖ to recenter. Map © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors. Rain overlay: <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">RainViewer</a> · ' +
      esc(new Date(frame.time * 1000).toLocaleDateString());
}
export const radarImagesOriginal = radarImages;
radarImages = function () {
  renderInteractiveRadar();
};
