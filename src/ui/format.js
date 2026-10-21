import { settings, state } from "../app/state.js";
export const $ = (id) => document.getElementById(id);
export const finite = (v) => typeof v === "number" && Number.isFinite(v);
export const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const key = (l) =>
  Number(l.latitude).toFixed(3) + "," + Number(l.longitude).toFixed(3);
export const fmt = (n, d = 0) =>
  finite(n)
    ? n.toLocaleString("en-GB", {
        maximumFractionDigits: d,
        minimumFractionDigits: d,
      })
    : "—";
export function unit(v, k) {
  if (!finite(v)) return null;
  if (k.includes("temperature"))
    return settings.temperature === "fahrenheit" ? (v * 9) / 5 + 32 : v;
  if (k.startsWith("wind_"))
    return settings.wind === "ms"
      ? v / 3.6
      : settings.wind === "mph"
        ? v / 1.609344
        : v;
  if (["precipitation", "rain"].includes(k))
    return settings.precipitation === "inch" ? v / 25.4 : v;
  return v;
}
export const temp = (v) => fmt(unit(v, "temperature_2m")) + "°";
export const wind = (v) =>
  fmt(unit(v, "wind_speed_10m")) +
  " " +
  { kmh: "km/h", ms: "m/s", mph: "mph" }[settings.wind];
export const rain = (v) =>
  fmt(unit(v, "precipitation"), settings.precipitation === "inch" ? 2 : 1) +
  " " +
  settings.precipitation;
export const direction = (v) =>
  finite(v)
    ? ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(v / 45) % 8]
    : "—";
export function time(t, opts = { hour: "2-digit", minute: "2-digit" }) {
  return finite(t)
    ? new Intl.DateTimeFormat("en-GB", {
        ...opts,
        timeZone:
          state.data?.timezone || state.location.timezone || "Europe/Vienna",
      }).format(new Date(t * 1000))
    : "—";
}
export function dateKey(
  t,
  tz = state.data?.timezone || state.location.timezone || "Europe/Vienna",
) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(t * 1000));
}
export function condition(c, day = 1) {
  if (!finite(c)) return ["◌", "Unavailable"];
  if (c === 0) return [day ? "☀️" : "🌙", "Clear sky"];
  if (c <= 2)
    return [day ? "🌤️" : "☁️", c === 1 ? "Mostly clear" : "Partly cloudy"];
  if (c === 3) return ["☁️", "Overcast"];
  if (c <= 48) return ["🌫️", "Fog"];
  if (c <= 57) return ["🌦️", "Drizzle"];
  if (c <= 67) return ["🌧️", c >= 66 ? "Freezing rain" : "Rain"];
  if (c <= 77) return ["🌨️", "Snow"];
  if (c <= 82) return ["🌦️", "Rain showers"];
  if (c <= 86) return ["🌨️", "Snow showers"];
  return ["⛈️", "Thunderstorm"];
}
