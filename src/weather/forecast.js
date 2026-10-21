import { state, settings } from "../app/state.js";
import { Store } from "../storage/storage.js";
import { key, $ } from "../ui/format.js";
import { validCache, prune } from "../storage/cache.js";
import { render } from "../app/navigation.js";
import { loadWarnings } from "../api/geoSphere.js";
import { updated, status } from "../ui/status.js";
import { MODELS, Provider } from "../api/openMeteo.js";
import { normalize } from "./normalize.js";
import { daily, consensus } from "./consensus.js";
import { saveSnapshots } from "./modelScoring.js";
import { validTimezone } from "../storage/validate.js";
export async function loadWeather(force = false) {
  if (state.busy && !force) return;
  const seq = ++state.seq,
    l = { ...state.location },
    candidate = Store.get("forecast:" + key(l)),
    cache = validCache(candidate, l) ? candidate : null,
    changed = state.data && key(state.data.location) !== key(l);
  state.error = "";
  state.busy = false;
  state.data = cache;
  if (changed) {
    state.histBusy = false;
    state.history = null;
    state.compare = null;
  }
  state.warnings = Store.get("warnings:" + key(l));
  render();
  loadWarnings(l, seq, force);
  if (
    cache &&
    !force &&
    Date.now() - cache.savedAt < settings.refresh * 60000
  ) {
    updated();
    return;
  }
  if (!navigator.onLine) {
    state.error = cache
      ? "Offline · showing saved forecast"
      : "You’re offline. Search saved locations or reconnect to load weather.";
    render();
    return;
  }
  state.busy = true;
  status("Updating forecasts…");
  $("refresh").disabled = true;
  const ids = ["best_match", ...MODELS.map((m) => m.id)];
  const results = await Promise.allSettled(
    ids.map((id) =>
      Provider.forecast(l, id).then((raw) => ({
        id,
        raw,
        rows: normalize(raw),
      })),
    ),
  );
  if (seq !== state.seq) return;
  const successes = results.flatMap((r) =>
      r.status === "fulfilled" ? [r.value] : [],
    ),
    base = successes.find((m) => m.id === "best_match"),
    models = successes.filter((m) => m.id !== "best_match");
  state.busy = false;
  $("refresh").disabled = false;
  if (!successes.length) {
    state.error =
      (cache ? "Saved forecast retained. " : "") +
      "Could not reach weather services. Check connection; Safari may have blocked the request.";
    render();
    return;
  }
  const raw = base?.raw || successes[0].raw;
  state.data = {
    savedAt: Date.now(),
    location: l,
    timezone: validTimezone(raw.timezone) ? raw.timezone : "Europe/Vienna",
    current: Number.isFinite(base?.raw.current?.time) ? base.raw.current : null,
    astro:
      Array.isArray(base?.raw.daily?.time) &&
      base.raw.daily.time.every(Number.isFinite)
        ? base.raw.daily
        : null,
    base: base?.rows || [],
    models: models.map(({ id, rows }) => ({ id, rows })),
    failures: ids.filter((id, i) => results[i].status === "rejected"),
  };
  state.data.rows = consensus(base, models);
  Store.set("forecast:" + key(l), state.data);
  prune("forecast:", 8);
  saveSnapshots(l, models, state.data.savedAt);
  if (state.data.failures.length)
    state.error =
      "Updated with " +
      successes.length +
      " sources · " +
      state.data.failures.length +
      " unavailable. See Models.";
  render();
}
