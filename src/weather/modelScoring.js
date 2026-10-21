import { key, time, esc, fmt, $, dateKey, finite } from "../ui/format.js";
import { Store } from "../storage/storage.js";
import { CORE } from "../api/openMeteo.js";
import { state } from "../app/state.js";
import { cachedHistory } from "./history.js";
export function saveSnapshots(l, models, issued) {
  const k = "snapshots:" + key(l),
    old = Store.get(k, []),
    bucket = Math.floor(issued / 21600000);
  if (old.some((x) => x.bucket === bucket)) return;
  old.push({
    bucket,
    issued,
    models: models.map((m) => ({
      id: m.id,
      rows: m.rows
        .filter(
          (r) => r.time >= issued / 1000 && r.time < issued / 1000 + 48 * 3600,
        )
        .map((r) =>
          Object.fromEntries(["time", ...CORE].map((k) => [k, r[k]])),
        ),
    })),
  });
  Store.set(
    k,
    old.filter((x) => x.issued > Date.now() - 35 * 86400000).slice(-36),
  );
}
export function scoresHTML(s) {
  return (
    '<p class="footnote">ERA5 proxy · 24–48h lead · evaluated ' +
    esc(new Date(s.savedAt).toLocaleDateString()) +
    '. Native metric units.</p><div class="scroll"><table><tr><th>Model</th><th>N temp</th><th>Temp MAE °C</th><th>Rain MAE mm</th><th>Wet/dry %</th><th>Wind MAE km/h</th><th>Pressure MAE hPa</th></tr>' +
    Object.entries(s.models)
      .map(
        ([id, m]) =>
          "<tr><td>" +
          esc(id) +
          "</td><td>" +
          m.temperature_2m.n +
          "</td><td>" +
          fmt(m.temperature_2m.sum / m.temperature_2m.n, 2) +
          "</td><td>" +
          fmt(m.precipitation.sum / m.precipitation.n, 2) +
          "</td><td>" +
          fmt(m.events.n ? (100 * m.events.correct) / m.events.n : null) +
          "</td><td>" +
          fmt(m.wind_speed_10m.sum / m.wind_speed_10m.n, 2) +
          "</td><td>" +
          fmt(m.pressure_msl.sum / m.pressure_msl.n, 2) +
          "</td></tr>",
      )
      .join("") +
    "</table></div>"
  );
}
export async function score() {
  const target = $("scoreMessage"),
    l = { ...state.location },
    seq = state.seq,
    snaps = Store.get("snapshots:" + key(l), []),
    eligible = snaps.filter((s) => s.issued < Date.now() - 9 * 86400000);
  if (!eligible.length) {
    target.textContent =
      "No mature forecasts yet. Revisit after at least nine days; saved 24–48h forecasts need time to enter ERA5.";
    return;
  }
  target.textContent = "Comparing saved forecasts with ERA5…";
  const out = { savedAt: Date.now(), models: {} },
    seen = new Set(),
    historyByDate = new Map();
  for (const s of eligible.slice(-8)) {
    for (const m of s.models) {
      for (const r of m.rows) {
        const lead = r.time - s.issued / 1000;
        if (lead < 86400 || lead >= 172800) continue;
        const unique = m.id + ":" + r.time;
        if (seen.has(unique)) continue;
        const histKey = dateKey(r.time);
        if (!historyByDate.has(histKey)) {
          try {
            historyByDate.set(histKey, await cachedHistory(l, histKey));
          } catch {
            historyByDate.set(histKey, null);
          }
        }
        const h = historyByDate.get(histKey);
        if (!h) continue;
        const obs = h.rows.find((o) => o.time === r.time);
        if (!obs) continue;
        seen.add(unique);
        out.models[m.id] ??= Object.fromEntries(
          [
            "temperature_2m",
            "precipitation",
            "wind_speed_10m",
            "pressure_msl",
            "events",
          ].map((k) => [k, { n: 0, sum: 0, correct: 0 }]),
        );
        for (const k of [
          "temperature_2m",
          "precipitation",
          "wind_speed_10m",
          "pressure_msl",
        ])
          if (finite(r[k]) && finite(obs[k])) {
            out.models[m.id][k].n++;
            out.models[m.id][k].sum += Math.abs(r[k] - obs[k]);
          }
        if (finite(r.precipitation) && finite(obs.precipitation)) {
          const e = out.models[m.id].events;
          e.n++;
          if (r.precipitation >= 0.1 === obs.precipitation >= 0.1) e.correct++;
        }
      }
    }
  }
  Store.set("scores:" + key(l), out);
  if (seq === state.seq && state.view === "models")
    $("scoreMessage").innerHTML = Object.keys(out.models).length
      ? scoresHTML(out)
      : "No matching reanalysis hours available yet.";
}
