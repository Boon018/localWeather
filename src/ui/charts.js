import { state } from "../app/state.js";
import {
  esc,
  time,
  condition,
  temp,
  rain,
  direction,
  wind,
  fmt,
  $,
  unit,
  finite,
} from "./format.js";
import { empty, upcoming } from "./components.js";
export const chartOptions = [
  ["temperature_2m", "Temperature"],
  ["apparent_temperature", "Feels like"],
  ["precipitation", "Precipitation / hour"],
  ["precipitation_probability", "Rain chance"],
  ["wind_speed_10m", "Wind"],
  ["wind_gusts_10m", "Gusts"],
  ["pressure_msl", "Pressure"],
  ["relative_humidity_2m", "Humidity"],
];
export function chartHTML(history = false) {
  return (
    '<div class="chart-controls"><select id="chartVar" aria-label="Chart variable">' +
    chartOptions
      .filter(
        (x) =>
          !history ||
          ![
            "apparent_temperature",
            "precipitation_probability",
            "wind_gusts_10m",
          ].includes(x[0]),
      )
      .map(
        ([k, n]) =>
          '<option value="' +
          k +
          '" ' +
          (state.chartVar === k ? "selected" : "") +
          ">" +
          n +
          "</option>",
      )
      .join("") +
    "</select>" +
    (history
      ? ""
      : '<select id="chartHours" aria-label="Chart horizon">' +
        [24, 48, 72, 168, 384]
          .map(
            (n) =>
              '<option value="' +
              n +
              '" ' +
              (state.chartHours === n ? "selected" : "") +
              ">" +
              n +
              " hours</option>",
          )
          .join("") +
        "</select>") +
    '</div><div class="chartbox"><svg class="chart" id="chart" role="img" aria-label="Weather chart"></svg><input type="range" class="range" id="chartCursor" min="0" value="0" aria-label="Inspect hour"><p class="chart-readout" id="chartReadout"></p></div>'
  );
}
export function tableHTML(rows) {
  const cols = [
    ["temperature_2m", "Temp"],
    ["apparent_temperature", "Feels"],
    ["precipitation_probability", "Rain %"],
    ["precipitation", "Precip. / h"],
    ["rain", "Rain / h"],
    ["snowfall", "Snow cm"],
    ["relative_humidity_2m", "RH %"],
    ["wind_speed_10m", "Wind"],
    ["wind_gusts_10m", "Gusts"],
    ["wind_direction_10m", "From"],
    ["pressure_msl", "hPa"],
    ["cloud_cover", "Cloud %"],
    ["uv_index", "UV"],
  ];
  return (
    '<div class="scroll"><table><thead><tr><th>Local time</th><th>Sky</th>' +
    cols.map((c) => "<th>" + c[1] + "</th>").join("") +
    "</tr></thead><tbody>" +
    rows
      .map(
        (r) =>
          "<tr><td>" +
          esc(
            time(r.time, {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
          ) +
          "</td><td>" +
          condition(r.weather_code, r.is_day)[0] +
          "</td>" +
          cols
            .map(
              ([k]) =>
                "<td>" +
                esc(
                  k.includes("temperature")
                    ? temp(r[k])
                    : ["precipitation", "rain"].includes(k)
                      ? rain(r[k]) + "/h"
                      : k === "wind_direction_10m"
                        ? direction(r[k])
                        : k.startsWith("wind_")
                          ? wind(r[k])
                          : fmt(
                              r[k],
                              k === "snowfall" || k === "uv_index" ? 1 : 0,
                            ),
                ) +
                "</td>",
            )
            .join("") +
          "</tr>",
      )
      .join("") +
    "</tbody></table></div>"
  );
}
export function hourlyView() {
  if (!state.data) return empty();
  return (
    '<h2 class="headline">Hour by hour</h2><section class="card">' +
    chartHTML() +
    "<small>Slide to inspect · " +
    esc(state.data.timezone) +
    ' · Missing values appear as gaps.</small></section><section class="card">' +
    tableHTML(upcoming().slice(0, state.chartHours)) +
    "</section>"
  );
}
export function drawChart() {
  const svg = $("chart");
  if (!svg) return;
  let rows =
    state.view === "history"
      ? state.history.rows
      : upcoming().slice(0, state.chartHours);
  let k = $("chartVar").value;
  if (!rows?.length) {
    svg.innerHTML =
      '<text x="20" y="90" fill="currentColor">No hourly data in this period. Refresh when online.</text>';
    return;
  }
  const values = rows.map((r) => unit(r[k], k)),
    valid = values.filter(finite);
  svg.setAttribute("viewBox", "0 0 600 190");
  if (!valid.length) {
    svg.innerHTML =
      '<text x="20" y="90" fill="currentColor">No data for this variable</text>';
    $("chartReadout").textContent = "";
    return;
  }
  let lo = Math.min(...valid),
    hi = Math.max(...valid);
  if (k === "precipitation") lo = 0;
  if (hi === lo) {
    hi += 1;
    lo -= 1;
  }
  const x = (i) => 45 + (i / Math.max(1, rows.length - 1)) * 540,
    y = (v) => 155 - ((v - lo) / (hi - lo)) * 130;
  let path = "",
    active = false;
  values.forEach((v, i) => {
    if (!finite(v)) {
      active = false;
      return;
    }
    path +=
      (active ? "L" : "M") + x(i).toFixed(1) + "," + y(v).toFixed(1) + " ";
    active = true;
  });
  svg.innerHTML =
    [0, 0.5, 1]
      .map(
        (a) =>
          '<line x1="45" x2="590" y1="' +
          (155 - a * 130) +
          '" y2="' +
          (155 - a * 130) +
          '" stroke="currentColor" opacity=".12"/><text x="0" y="' +
          (160 - a * 130) +
          '" fill="currentColor" font-size="13">' +
          fmt(lo + (hi - lo) * a, 1) +
          "</text>",
      )
      .join("") +
    '<path d="' +
    path +
    '" fill="none" stroke="var(--accent)" stroke-width="3"/><text x="45" y="183" fill="currentColor" font-size="13">' +
    esc(
      time(rows[0].time, { day: "numeric", month: "short", hour: "2-digit" }),
    ) +
    '</text><text x="590" y="183" text-anchor="end" fill="currentColor" font-size="13">' +
    esc(
      time(rows.at(-1).time, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
      }),
    ) +
    '</text><line id="cursorLine" y1="20" y2="155" stroke="var(--accent)" opacity=".5"/>';
  const cursor = $("chartCursor");
  cursor.max = rows.length - 1;
  function inspect(i) {
    const r = rows[i];
    $("cursorLine").setAttribute("x1", x(i));
    $("cursorLine").setAttribute("x2", x(i));
    let value = k.includes("temperature")
      ? temp(r[k])
      : k === "precipitation"
        ? rain(r[k]) + "/h"
        : k.startsWith("wind_")
          ? wind(r[k])
          : fmt(r[k], 1) +
            (k === "pressure_msl"
              ? " hPa"
              : k.includes("probability") || k.includes("humidity")
                ? "%"
                : "");
    $("chartReadout").textContent =
      time(r.time, { weekday: "short", hour: "2-digit", minute: "2-digit" }) +
      " · " +
      value;
    cursor.value = i;
  }
  cursor.oninput = () => inspect(+cursor.value);
  svg.onpointerdown = (e) => {
    const box = svg.getBoundingClientRect();
    inspect(
      Math.max(
        0,
        Math.min(
          rows.length - 1,
          Math.round(
            ((((e.clientX - box.left) / box.width) * 600 - 45) / 540) *
              (rows.length - 1),
          ),
        ),
      ),
    );
  };
  inspect(0);
}
