import { json } from "./http.js";
let cached = null,
  pending = null,
  savedAt = 0;
export function normalizeRadar(data) {
  const host = new URL(data?.host);
  if (
    host.protocol !== "https:" ||
    !["tilecache.rainviewer.com", "tilecache.rainviewer.net"].includes(
      host.hostname,
    ) ||
    host.username ||
    host.password ||
    host.port
  )
    throw Error("Unexpected radar host");
  const unique = new Map();
  for (const f of Array.isArray(data?.radar?.past) ? data.radar.past : [])
    if (
      f &&
      Number.isFinite(f.time) &&
      f.time > 0 &&
      typeof f.path === "string" &&
      /^\/v2\/radar\/[\w-]+$/.test(f.path)
    )
      unique.set(f.time, { time: f.time, path: f.path });
  const frames = [...unique.values()]
    .sort((a, b) => a.time - b.time)
    .slice(-24);
  if (!frames.length) throw Error("No past radar frames returned");
  return { host: host.origin, frames };
}
export async function radarMetadata() {
  if (cached && Date.now() - savedAt < 300000) return cached;
  if (!pending)
    pending = json("https://api.rainviewer.com/public/weather-maps.json")
      .then(normalizeRadar)
      .then((data) => {
        cached = data;
        savedAt = Date.now();
        return data;
      })
      .finally(() => {
        pending = null;
      });
  return pending;
}
