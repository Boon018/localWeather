import { state, settings } from "../app/state.js";
import { locationControls } from "./locationsView.js";
import { empty, upcoming, hourstrip, metric } from "./components.js";
import { daily } from "../weather/consensus.js";
import {
  dateKey,
  condition,
  time,
  temp,
  esc,
  rain,
  fmt,
  wind,
  direction,
  finite,
} from "./format.js";
import { warningsCard } from "../api/geoSphere.js";
import { radar, radarContent } from "../radar/legacy.js";
export function weatherView() {
  if (!state.data) return locationControls() + empty();
  const data = state.data,
    rs = upcoming(),
    h = rs[0] || {},
    c = data.current || h,
    days = daily(data.rows),
    today = days.find((d) => d.date === dateKey(Date.now() / 1000)) || days[0],
    co = condition(c.weather_code, c.is_day);
  const ai =
    data.astro?.time?.findIndex((t) => dateKey(t) === today?.date) ?? -1;
  return (
    locationControls() +
    '<div class="weather-columns"><div><section class="hero"><div class="condition-icon">' +
    co[0] +
    '</div><div class="temperature">' +
    temp(c.temperature_2m) +
    '</div><div class="condition">' +
    co[1] +
    '</div><p class="muted">Feels like ' +
    temp(c.apparent_temperature) +
    " · H " +
    temp(today?.high) +
    " / L " +
    temp(today?.low) +
    '</p><div class="pill">' +
    (data.current
      ? "Current model estimate · " + time(c.time)
      : "Hourly consensus estimate") +
    '</div></section><section class="card"><div class="sectionhead"><h2>Next 24 hours</h2><button data-view="hourly">Details</button></div>' +
    hourstrip(rs.slice(0, 24)) +
    "<small>Temperature & rainfall amount: consensus. Conditions & probability: Open-Meteo Best Match.</small></section>" +
    warningsCard() +
    '<section class="card"><div class="sectionhead"><h2>Weather radar</h2><button data-action="radar">' +
    (state.radarBusy ? "Loading…" : state.radar ? "Refresh" : "Load radar") +
    "</button></div>" +
    radarContent() +
    '</section></div><div><section class="card days"><div class="sectionhead"><h2>' +
    days.length +
    '-day outlook</h2><span class="tag">Tap a day</span></div>' +
    days
      .map(
        (d, i) =>
          '<details><summary class="dayrow"><span>' +
          esc(
            d.date === dateKey(Date.now() / 1000)
              ? "Today"
              : time(d.time, { weekday: "short", day: "numeric" }),
          ) +
          "</span><span>" +
          condition(d.code)[0] +
          '</span><div><div class="bar"></div><small class="blue">' +
          rain(d.precip) +
          '</small></div><span class="daytemp"><span class="muted">' +
          temp(d.low) +
          "</span> " +
          temp(d.high) +
          '</span></summary><div class="dayextra"><p>Rain chance ' +
          fmt(d.prob) +
          "% · Wind " +
          wind(d.wind) +
          " · Gusts " +
          wind(d.gust) +
          '</p><p class="footnote">' +
          (i >= 7 ? "Long-range trend: lower confidence. " : "") +
          (d.complete ? "" : "Partial day. ") +
          "Daily rain chance is the maximum hourly probability.</p>" +
          hourstrip(d.rows) +
          "</div></details>",
      )
      .join("") +
    '</section></div></div><section class="card"><div class="sectionhead"><h2>At a glance</h2><small>Current model / nearest hour</small></div><div class="grid">' +
    metric(
      "Rain chance",
      fmt(h.precipitation_probability) + "%",
      "This hour · Best Match",
    ) +
    metric(
      "Hourly precipitation",
      rain(h.precipitation) + "/h",
      "Hour ending " + time(h.time),
    ) +
    metric(
      "Precipitation",
      rain(c.precipitation),
      data.current
        ? "Previous " + fmt((c.interval || 900) / 60) + " minutes"
        : "Hourly accumulation",
    ) +
    metric("Humidity", fmt(c.relative_humidity_2m) + "%") +
    metric("Wind", wind(c.wind_speed_10m), direction(c.wind_direction_10m)) +
    metric("Gusts", wind(c.wind_gusts_10m)) +
    metric("Pressure", fmt(c.pressure_msl) + " hPa", "Sea level") +
    metric("Cloud cover", fmt(c.cloud_cover) + "%") +
    metric(
      "Visibility",
      finite(h.visibility) ? fmt(h.visibility / 1000, 1) + " km" : "—",
      "Nearest hour",
    ) +
    metric("UV index", fmt(h.uv_index, 1), "Nearest hour") +
    metric("Sunrise", time(data.astro?.sunrise?.[ai])) +
    metric("Sunset", time(data.astro?.sunset?.[ai])) +
    metric(
      "Model spread",
      finite(h.tempSpread)
        ? fmt(
            h.tempSpread * (settings.temperature === "fahrenheit" ? 1.8 : 1),
            1,
          ) + "°"
        : "—",
      h.contributors + " models · temperature range",
    ) +
    '</div></section><p class="footnote">Weather data: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> · DWD / ECMWF / NOAA · CC BY 4.0. All times: ' +
    esc(data.timezone) +
    ".</p>"
  );
}
