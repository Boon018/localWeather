import { state } from "../app/state.js";
import { upcoming, metric } from "./components.js";
import { Store } from "../storage/storage.js";
import { key, time, temp, rain, wind } from "./format.js";
import { MODELS } from "../api/openMeteo.js";
import { scoresHTML } from "../weather/modelScoring.js";
export function modelView() {
  const d = state.data,
    h = upcoming()[0],
    snaps = Store.get("snapshots:" + key(state.location), []),
    scores = Store.get("scores:" + key(state.location));
  return (
    '<h2 class="headline">Behind the forecast</h2><section class="card"><h3>Regional detail. Global perspective.</h3><p class="muted">ICON gets the most influence in the first 48 hours. ECMWF takes the lead farther out. We renormalize weights whenever a model or variable is missing.</p><p class="footnote">This is an experimental heuristic, not a proven improvement over any provider. Alpine terrain and thunderstorms can differ sharply within one model grid cell.</p></section>' +
    MODELS.map((m) => {
      const model = d?.models.find((x) => x.id === m.id),
        r = model?.rows.find((x) => x.time === h?.time);
      return (
        '<section class="card"><div class="sectionhead"><h2>' +
        m.name +
        '</h2><span class="pill">' +
        (model ? "Available" : "Unavailable") +
        '</span></div><p class="muted">' +
        m.detail +
        '</p><div class="grid" style="margin-top:16px">' +
        metric("Next hour", temp(r?.temperature_2m)) +
        metric("Precipitation", rain(r?.precipitation)) +
        metric("Wind", wind(r?.wind_speed_10m)) +
        '</div><p class="footnote">Retrieved ' +
        (d ? time(d.savedAt / 1000) : "—") +
        " · Only non-null hours contribute.</p></section>"
      );
    }).join("") +
    (d
      ? '<section class="card"><h2>Next 24 hours · temperature</h2><div class="scroll"><table><thead><tr><th>Hour</th>' +
        MODELS.map((m) => "<th>" + m.name + "</th>").join("") +
        "<th>Consensus</th></tr></thead><tbody>" +
        upcoming()
          .slice(0, 24)
          .map(
            (r) =>
              "<tr><td>" +
              time(r.time) +
              "</td>" +
              MODELS.map(
                (m) =>
                  "<td>" +
                  temp(
                    d.models
                      .find((x) => x.id === m.id)
                      ?.rows.find((x) => x.time === r.time)?.temperature_2m,
                  ) +
                  "</td>",
              ).join("") +
              "<td>" +
              temp(r.temperature_2m) +
              "</td></tr>",
          )
          .join("") +
        "</tbody></table></div></section>"
      : "") +
    '<section class="card stack"><h2>How consensus works</h2><p>Temperature, pressure, wind speed and cloud cover use lead-time-weighted means. Hourly precipitation and gusts use weighted medians to limit single-model outliers. This can miss extremes; use official warnings for hazards.</p><p>Rain probability, weather icons, feels-like, humidity, direction, rain/snow split, UV and visibility come from Best Match. These fields are not recomputed from the consensus and may differ. Current weather is a model estimate from Best Match, not a weather station.</p><p>Best Match is never an additional consensus vote. When all explicit models lack a variable, Best Match fills the gap. Daily totals and highs/lows are calculated from hourly consensus; daily rain chance is the highest hourly probability.</p><p>ICON weights: 0.50 / 0.40 / 0.25 for &lt;48 / 48–120 / ≥120 hours. ECMWF: 0.30 before 48h, then 0.45. GFS: 0.20 before 48h, then 0.30. Available weights are normalized.</p><p class="footnote">Retrieval time is not model initialization time. The free forecast response does not expose a reliable run timestamp.</p></section><section class="card stack"><h2>Local forecast journal</h2><p>' +
    snaps.length +
    ' snapshots saved for this location. At most one per six hours; each retains the next 48 hours. Retention: 35 days, up to 36 snapshots.</p><button data-action="score">Evaluate mature forecasts</button><div id="scoreMessage">' +
    (scores
      ? scoresHTML(scores)
      : '<p class="footnote">Scores need forecasts saved at least seven days ago. Evaluation uses ERA5 as a proxy, not independent station truth. No learned weights are applied.</p>') +
    "</div></section>"
  );
}
