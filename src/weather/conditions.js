// Display policy only: preserve raw provider codes and forecast quantities.
// 0.05 mm is the boundary at which the default one-decimal display becomes 0.1.
const ordinaryRain = new Set([51, 53, 55, 61, 63, 65, 80, 81, 82]);
export function displayWeatherCode(row = {}) {
  const {
    weather_code: code,
    precipitation: amount,
    precipitation_probability: probability,
    cloud_cover: cloud,
  } = row;
  if (
    !ordinaryRain.has(code) ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    amount >= 0.05 ||
    !Number.isFinite(probability) ||
    probability < 0 ||
    probability >= 40
  )
    return code;
  // Missing cloud cover must not be interpreted as a clear sky.
  if (!Number.isFinite(cloud) || cloud < 0 || cloud > 100) return 3;
  return cloud < 10 ? 0 : cloud < 30 ? 1 : cloud < 80 ? 2 : 3;
}
export function currentDisplayRow(current, rows) {
  if (!Number.isFinite(current?.time)) return current;
  const hour = rows
    .filter(
      (r) =>
        Number.isFinite(r.time) &&
        r.time <= current.time &&
        current.time - r.time < 3600,
    )
    .reduce((a, b) => (!a || b.time > a.time ? b : a), null);
  // Use the current interval's own amount, never replace it with a dry hourly
  // consensus. Use the current hour, matching the displayed probability; a
  // wetter following hour must not leak into the current condition late in an hour.
  return {
    ...current,
    precipitation_probability: hour?.precipitation_probability,
  };
}
export function dailyDisplayRow(day) {
  const clouds = day.rows
    .map((r) => r.cloud_cover)
    .filter((v) => Number.isFinite(v) && v >= 0 && v <= 100);
  return {
    weather_code: day.code,
    precipitation: day.precip,
    precipitation_probability: day.prob,
    cloud_cover: clouds.length
      ? clouds.reduce((a, b) => a + b, 0) / clouds.length
      : null,
  };
}
