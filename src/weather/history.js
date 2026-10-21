import { key, $, dateKey, finite, temp, fmt, rain } from "../ui/format.js";
import { Store } from "../storage/storage.js";
import { Provider } from "../api/openMeteo.js";
import { normalize } from "./normalize.js";
import { prune } from "../storage/cache.js";
import { state, settings } from "../app/state.js";
import { render } from "../app/navigation.js";
import { sumComplete } from "../ui/components.js";
import { daily } from "./consensus.js";
export async function cachedHistory(l, date) {
  const k = "history:" + key(l) + ":" + date,
    hit = Store.get(k);
  if (hit) return hit;
  const raw = await Provider.history(l, date),
    out = {
      savedAt: Date.now(),
      date,
      timezone: raw.timezone,
      rows: normalize(raw),
    };
  Store.set(k, out);
  prune("history:", 40);
  return out;
}
export async function getHistory(date) {
  const l = { ...state.location },
    request = ++state.historyRequest;
  const current = () =>
    request === state.historyRequest && key(l) === key(state.location);
  state.histBusy = true;
  state.histDate = date;
  render();
  $("historyMessage").textContent = "Loading reanalysis…";
  try {
    const h = await cachedHistory(l, date);
    if (!current()) return;
    state.history = h;
    state.histBusy = false;
    if (state.view === "history") render();
  } catch (e) {
    if (!current()) return;
    state.histBusy = false;
    if (state.view === "history") {
      $("historyMessage").textContent =
        "Historical data unavailable. " + e.message;
      $("historyForm").querySelector("button").disabled = false;
    }
  }
}
export async function compareHistory() {
  if (state.histBusy) return;
  state.histBusy = true;
  const l = { ...state.location },
    request = ++state.historyRequest,
    today = dateKey(Date.now() / 1000),
    year = +today.slice(0, 4),
    md = today.slice(5);
  $("compareResult").textContent = "Loading ten past years…";
  const dates = Array.from(
    { length: 10 },
    (_, i) => year - i - 1 + "-" + md,
  ).filter((d) => new Date(d + "T12:00:00Z").toISOString().slice(0, 10) === d);
  const results = [];
  for (const d of dates) {
    if (request !== state.historyRequest || key(l) !== key(state.location))
      return;
    try {
      results.push(await cachedHistory(l, d));
    } catch {}
  }
  if (request !== state.historyRequest || key(l) !== key(state.location))
    return;
  state.histBusy = false;
  const means = results
      .filter((h) => h.rows.every((r) => finite(r.temperature_2m)))
      .map(
        (h) => h.rows.reduce((s, r) => s + r.temperature_2m, 0) / h.rows.length,
      ),
    precips = results
      .map((h) => sumComplete(h.rows, "precipitation"))
      .filter(finite);
  if (!means.length) {
    if ($("compareResult"))
      $("compareResult").textContent =
        "Historical comparison unavailable. Please try again later.";
    return;
  }
  const mean = means.reduce((a, b) => a + b, 0) / means.length,
    day = state.data
      ? daily(state.data.rows).find((d) => d.date === today)
      : null,
    now = day?.rows.every((r) => finite(r.temperature_2m))
      ? day.rows.reduce((s, r) => s + r.temperature_2m, 0) / day.rows.length
      : null,
    delta = finite(now)
      ? (now - mean) * (settings.temperature === "fahrenheit" ? 1.8 : 1)
      : null;
  state.compare =
    '<div class="notice"><p>Same-date mean: <strong>' +
    temp(mean) +
    "</strong> · " +
    means.length +
    " / " +
    dates.length +
    " years available.</p><p>Today’s forecast daily mean: " +
    temp(now) +
    (finite(delta)
      ? " · " +
        (delta >= 0 ? "+" : "") +
        fmt(delta, 1) +
        "° " +
        (delta >= 0 ? "warmer" : "colder")
      : "") +
    ".</p><p>Mean daily precipitation: " +
    rain(
      precips.length
        ? precips.reduce((a, b) => a + b, 0) / precips.length
        : null,
    ) +
    ".</p><small>No statistical unusualness claim is made from this small sample.</small></div>";
  if (state.view === "history") render();
}
