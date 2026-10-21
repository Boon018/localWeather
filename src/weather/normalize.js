import { time, finite } from "../ui/format.js";
export function normalize(d) {
  if (!d || !d.hourly || !Array.isArray(d.hourly.time) || !d.hourly.time.length)
    throw Error("Incomplete weather response");
  if (!d.hourly.temperature_2m?.some(finite))
    throw Error("No temperature data available");
  return d.hourly.time.map((t, i) => {
    if (!finite(t)) throw Error("Invalid weather timestamp");
    const row = { time: t };
    for (const [k, a] of Object.entries(d.hourly)) {
      if (k !== "time") row[k] = Array.isArray(a) && finite(a[i]) ? a[i] : null;
    }
    return row;
  });
}
