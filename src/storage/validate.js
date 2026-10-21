// Validate on read; never rewrite or delete a legacy value to recover from it.
const object = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const number = Number.isFinite;
export function validTimezone(value) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return typeof value === "string";
  } catch {
    return false;
  }
}
export function validLocation(value) {
  return (
    object(value) &&
    typeof value.name === "string" &&
    number(value.latitude) &&
    Math.abs(value.latitude) <= 90 &&
    number(value.longitude) &&
    Math.abs(value.longitude) <= 180 &&
    (!value.timezone || validTimezone(value.timezone))
  );
}
const rows = (value) =>
  Array.isArray(value) && value.every((r) => object(r) && number(r.time));
const model = (value) =>
  object(value) && typeof value.id === "string" && rows(value.rows);
export function readValue(key, value, fallback) {
  if (key === "favorites")
    return Array.isArray(value) ? value.filter(validLocation) : fallback;
  if (key === "location") return validLocation(value) ? value : fallback;
  if (key === "settings") return object(value) ? value : fallback;
  if (key.startsWith("forecast:"))
    return object(value) &&
      validLocation(value.location) &&
      number(value.savedAt) &&
      rows(value.rows) &&
      value.rows.length &&
      value.rows.every((r) => number(r.temperature_2m)) &&
      Array.isArray(value.models) &&
      value.models.every(model) &&
      (!value.timezone || validTimezone(value.timezone)) &&
      (!value.base || rows(value.base)) &&
      (!value.current || object(value.current)) &&
      (!value.astro || object(value.astro))
      ? value
      : fallback;
  if (key.startsWith("history:"))
    return object(value) &&
      typeof value.date === "string" &&
      rows(value.rows) &&
      value.rows.length &&
      value.rows.some((r) => number(r.temperature_2m)) &&
      (!value.timezone || validTimezone(value.timezone))
      ? value
      : fallback;
  if (key.startsWith("warnings:"))
    return object(value) && Array.isArray(value.warnings)
      ? { ...value, warnings: value.warnings.filter(object) }
      : fallback;
  if (key.startsWith("snapshots:"))
    return Array.isArray(value)
      ? value.filter(
          (s) =>
            object(s) &&
            number(s.issued) &&
            Array.isArray(s.models) &&
            s.models.every(model),
        )
      : fallback;
  if (key.startsWith("scores:")) {
    const fields = [
      "temperature_2m",
      "precipitation",
      "wind_speed_10m",
      "pressure_msl",
      "events",
    ];
    return object(value) &&
      object(value.models) &&
      Object.values(value.models).every(
        (m) =>
          object(m) &&
          fields.every(
            (k) =>
              object(m[k]) &&
              number(m[k].n) &&
              m[k].n >= 0 &&
              number(m[k].sum) &&
              number(m[k].correct),
          ),
      )
      ? value
      : fallback;
  }
  return value;
}
export function readSettings(value) {
  const choice = (key, allowed, defaultValue) =>
    allowed.includes(value[key]) ? value[key] : defaultValue;
  return {
    ...value,
    theme: choice("theme", ["auto", "dark", "light"], "auto"),
    temperature: choice("temperature", ["celsius", "fahrenheit"], "celsius"),
    wind: choice("wind", ["kmh", "ms", "mph"], "kmh"),
    precipitation: choice("precipitation", ["mm", "inch"], "mm"),
    refresh: choice("refresh", [30, 60, 180], 30),
    defaultLocation: validLocation(value.defaultLocation)
      ? value.defaultLocation
      : null,
  };
}
