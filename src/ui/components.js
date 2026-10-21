import { esc, time, condition, temp, rain, finite, fmt } from "./format.js";
import { state } from "../app/state.js";
export function metric(label, value, detail = "") {
  return (
    '<div class="metric"><div class="label">' +
    esc(label) +
    '</div><div class="value">' +
    esc(value) +
    "</div>" +
    (detail ? "<small>" + esc(detail) + "</small>" : "") +
    "</div>"
  );
}
export function upcoming() {
  return (state.data?.rows || []).filter(
    (r) => r.time >= Math.floor(Date.now() / 3600000) * 3600,
  );
}
export function hourstrip(rows) {
  return (
    '<div class="hourstrip">' +
    rows
      .map(
        (r) =>
          '<div class="hour"><small>' +
          esc(time(r.time)) +
          '</small><span class="wi">' +
          condition(r.weather_code, r.is_day)[0] +
          "</span><strong>" +
          temp(r.temperature_2m) +
          '</strong><small class="blue" title="Total precipitation in the hour ending at this time">' +
          rain(r.precipitation) +
          '/h</small><small style="display:block">' +
          (finite(r.precipitation_probability)
            ? fmt(r.precipitation_probability) + "% chance"
            : "Chance —") +
          "</small></div>",
      )
      .join("") +
    "</div>"
  );
}
export function empty() {
  return (
    '<section class="card empty"><div class="wi">🌤️</div><h2>Your weather, here</h2><p class="muted">' +
    (state.busy
      ? "Fetching your forecast…"
      : "Choose a location or refresh to load weather.") +
    '</p><button data-view="locations" style="margin-top:20px">Choose a location</button></section>'
  );
}
export function sumComplete(rows, k) {
  return rows.length && rows.every((r) => finite(r[k]))
    ? rows.reduce((s, r) => s + r[k], 0)
    : null;
}
