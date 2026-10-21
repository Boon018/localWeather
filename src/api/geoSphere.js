import { Store } from "../storage/storage.js";
import { key, $, finite, esc, time } from "../ui/format.js";
import { json } from "./http.js";
import { prune } from "../storage/cache.js";
import { state } from "../app/state.js";
import { render } from "../app/navigation.js";
export async function loadWarnings(l, seq, force = false) {
  const cached = Store.get("warnings:" + key(l));
  if (cached && !force && Date.now() - cached.savedAt < 15 * 60000) return;
  if (!navigator.onLine) return;
  try {
    const raw = await json(
      "https://warnungen.zamg.at/wsapp/api/getWarningsForCoords",
      { lat: l.latitude, lon: l.longitude, lang: "en" },
    );
    if (!Array.isArray(raw.properties?.warnings))
      throw Error("Unknown warning response");
    const data = {
      savedAt: Date.now(),
      name: raw.properties.location?.properties?.name || l.name,
      warnings: raw.properties.warnings
        .map((w) => w.properties)
        .filter(Boolean),
    };
    Store.set("warnings:" + key(l), data);
    prune("warnings:", 8);
    if (seq !== state.seq) return;
    state.warnings = data;
    if (state.location.name.startsWith("My location · ") && data.name) {
      state.location.name = data.name;
      Store.set("location", state.location);
      $("locationTitle").textContent = data.name;
    }
    if (state.view === "weather") render();
  } catch {
    if (seq === state.seq) {
      state.warnings = cached ? { ...cached, failed: true } : { failed: true };
      if (state.view === "weather") render();
    }
  }
}
export function warningsCard() {
  const w = state.warnings,
    stale =
      !w?.savedAt ||
      Date.now() - w.savedAt > 15 * 60000 ||
      w.failed ||
      !navigator.onLine;
  const warnings = (w?.warnings || []).filter(
    (p) =>
      !finite(Number(p.rawinfo?.end)) ||
      Number(p.rawinfo.end) > Date.now() / 1000,
  );
  return (
    '<section class="card"><div class="sectionhead"><h2>Official warnings</h2><span class="tag">GeoSphere Austria</span></div>' +
    (w?.savedAt
      ? '<p class="footnote">' +
        esc(w.name) +
        " · " +
        (stale ? "Saved status, may be outdated · " : "Checked ") +
        time(w.savedAt / 1000) +
        "</p>"
      : "") +
    (warnings.length
      ? warnings
          .map(
            (p) =>
              '<details class="notice warning"><summary><strong>' +
              esc(p.text || "Weather warning") +
              "</strong><br><small>Severity: " +
              esc(
                { 0: "None", 1: "Yellow", 2: "Orange", 3: "Red" }[
                  p.warnstufeid
                ] || String(p.warnstufeid ?? "Unspecified"),
              ) +
              " · " +
              esc(p.begin) +
              " – " +
              esc(p.end) +
              ' (Austria local time)</small></summary><p style="white-space:pre-line">' +
              esc(
                [p.meteotext, p.auswirkungen, p.empfehlungen]
                  .filter(Boolean)
                  .join("\n\n"),
              ) +
              "</p></details>",
          )
          .join("")
      : w?.savedAt && !stale
        ? '<p class="muted">No active or upcoming warnings returned for this municipality at the last check.</p>'
        : '<p class="muted">Current warning status unavailable. Check the official map.</p>') +
    '<a href="https://warnungen.zamg.at/" target="_blank" rel="noreferrer" style="display:inline-block;padding:12px 0">Open official warning map ↗</a><p class="footnote">GeoSphere Austria · CC BY 4.0. Local weather can change between checks. This feed is not a continuous alert service.</p></section>'
  );
}
