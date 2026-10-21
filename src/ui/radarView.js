import { state } from "../app/state.js";
import { key, esc, time } from "./format.js";
import { render } from "../app/navigation.js";
import { radarMetadata } from "../api/rainViewer.js";
import { RadarMap } from "../radar/map.js";
import { normalizedPoint } from "../radar/projection.js";
let widget = null;
export function radarContent() {
  const link =
    '<p class="footnote"><a href="https://www.rainviewer.com/weather-radar-map-live.html" target="_blank" rel="noreferrer">Open RainViewer radar map ↗</a></p>';
  if (!state.radarOpened)
    return (
      '<p class="muted">Load recent precipitation around ' +
      esc(state.location.name) +
      ". Map and radar providers receive tile requests only when you open this map.</p>" +
      link
    );
  return (
    (state.radarError
      ? '<p class="notice warning" role="alert">' +
        esc(state.radarError) +
        "</p>"
      : "") +
    '<div id="radarMount"></div>' +
    link
  );
}
export function radarImages() {
  const host = document.getElementById("radarMount");
  // VM regression harnesses intentionally do not emulate layout or DOM attachment.
  if (!host || !host.append || !state.radarOpened) {
    if (widget) {
      widget.destroy();
      widget = null;
    }
    return;
  }
  const locationKey = key(state.location);
  if (widget && widget.view.locationKey !== locationKey) {
    widget.destroy();
    widget = null;
  }
  if (!state.radarMap || state.radarMap.locationKey !== locationKey)
    state.radarMap = {
      locationKey,
      ...normalizedPoint(state.location.latitude, state.location.longitude),
      z: 7,
      opacity: 76,
    };
  if (!widget)
    widget = new RadarMap(
      state.radarMap,
      () => ({
        location: state.location,
        radar: state.radar,
        index: state.radarIndex,
        busy: state.radarBusy,
        error: state.radarError,
      }),
      (index) => {
        state.radarIndex = index;
      },
      time,
    );
  widget.attach(host);
}
export async function radar() {
  if (state.radarBusy) return;
  const request = ++state.radarRequest,
    locationKey = key(state.location);
  state.radarOpened = true;
  state.radarBusy = true;
  state.radarError = "";
  render();
  try {
    const data = await radarMetadata();
    if (request !== state.radarRequest || locationKey !== key(state.location))
      return;
    state.radar = { ...data, locationKey };
    state.radarIndex = data.frames.length - 1;
  } catch {
    if (request === state.radarRequest)
      state.radarError =
        "Radar could not load. The map is still usable; try again later. Existing frames may be old.";
  } finally {
    if (request === state.radarRequest) {
      state.radarBusy = false;
      if (state.view === "weather") render();
    }
  }
}
