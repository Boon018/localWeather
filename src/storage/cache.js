import { priorCacheProbe, Store } from "./storage.js";
import { key, finite, time, esc } from "../ui/format.js";
import { state } from "../app/state.js";
export function cacheDiagnostics() {
  const result = {
    write: false,
    forecast: false,
    previousSession: !!priorCacheProbe,
    locations: 0,
    error: "",
  };
  const probe = Store.prefix + "diagnostic";
  try {
    const value = "probe-" + Date.now();
    localStorage.setItem(probe, value);
    result.write = localStorage.getItem(probe) === value;
    localStorage.removeItem(probe);
    const raw = localStorage.getItem(
      Store.prefix + "forecast:" + key(state.location),
    );
    const saved = raw ? JSON.parse(raw) : null;
    result.forecast = validCache(saved, state.location);
    result.locations = Object.keys(localStorage).filter((k) =>
      k.startsWith(Store.prefix + "forecast:"),
    ).length;
  } catch (e) {
    result.error = e.name || "Storage unavailable";
  }
  return result;
}
export function validCache(d, l) {
  return !!(
    d &&
    finite(d.savedAt) &&
    d.location &&
    key(d.location) === key(l) &&
    Array.isArray(d.rows) &&
    d.rows.length &&
    d.rows.every((r) => r && finite(r.time) && finite(r.temperature_2m)) &&
    Array.isArray(d.models)
  );
}
export function cacheReport() {
  const r = cacheDiagnostics();
  return (
    "<p>" +
    (r.write
      ? "Device storage write/read passed."
      : "Device storage failed: this session may be memory-only.") +
    "</p><p>" +
    (r.forecast
      ? "A valid forecast for " +
        esc(state.location.name) +
        " is saved on disk."
      : "No valid forecast is saved on disk for this location yet.") +
    " " +
    r.locations +
    " cached location(s).</p><p>" +
    (r.previousSession
      ? "A marker from an earlier page session was recovered."
      : "To test persistence, close and reopen this exact file, then run this check again.") +
    '</p><p class="footnote">For a full offline check: load weather, enable Airplane Mode, reopen the same file and tap Refresh. Renamed files, Private Browsing and another browser may use different storage.</p>'
  );
}
export function prune(prefix, limit) {
  const keys = Store.keys().filter((k) => k.startsWith(prefix));
  keys.sort(
    (a, b) => (Store.get(b)?.savedAt || 0) - (Store.get(a)?.savedAt || 0),
  );
  keys.slice(limit).forEach((k) => Store.remove(k));
}
