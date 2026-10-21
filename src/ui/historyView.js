import { esc, temp, finite, rain } from "./format.js";
import { state } from "../app/state.js";
import { metric, sumComplete } from "./components.js";
import { chartHTML, tableHTML } from "./charts.js";
export function historyView() {
  const max = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  return (
    '<h2 class="headline">A look back</h2><section class="card"><h3>' +
    esc(state.location.name) +
    '</h3><p class="muted">Explore hourly weather since 1940.</p><form id="historyForm"><input type="date" id="historyDate" min="1940-01-01" max="' +
    max +
    '" value="' +
    esc(state.histDate || max) +
    '" required aria-label="Historical date"><button class="primary" ' +
    (state.histBusy ? "disabled" : "") +
    '>Find</button></form><p class="footnote">ERA5 reanalysis: reconstructed weather, not a station measurement. The latest seven days are excluded to allow for publication delay.</p><div id="historyMessage" role="status"></div></section>' +
    (state.history
      ? '<section class="card"><div class="sectionhead"><h2>' +
        esc(state.history.date) +
        "</h2><small>ERA5 · " +
        esc(state.history.timezone) +
        '</small></div><div class="grid">' +
        metric(
          "High",
          temp(
            Math.max(
              ...state.history.rows.map((r) => r.temperature_2m).filter(finite),
            ),
          ),
        ) +
        metric(
          "Low",
          temp(
            Math.min(
              ...state.history.rows.map((r) => r.temperature_2m).filter(finite),
            ),
          ),
        ) +
        metric(
          "Precipitation",
          rain(sumComplete(state.history.rows, "precipitation")),
        ) +
        '</div><hr class="divider">' +
        chartHTML(true) +
        '</section><section class="card">' +
        tableHTML(state.history.rows) +
        "</section>"
      : "") +
    '<section class="card"><h2>This day in past years</h2><p class="muted">Compare today with the same calendar day in the previous ten years.</p><button data-action="compare" style="margin-top:16px" ' +
    (state.histBusy ? "disabled" : "") +
    '>Compare 10 years</button><p class="footnote">A small historical sample, not a 30-year climate normal. Uses ten daily ERA5 requests, cached locally.</p><div id="compareResult">' +
    (state.compare || "") +
    "</div></section>"
  );
}
