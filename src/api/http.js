import { status } from "../ui/status.js";
export async function json(url, params = {}, timeout = 18000) {
  const u = new URL(url);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const c = new AbortController(),
    timer = setTimeout(() => c.abort(), timeout);
  try {
    const r = await fetch(u, {
      cache: "no-store",
      signal: c.signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (!r.ok)
      throw Error(
        r.status === 429
          ? "Rate limit reached. Please try later."
          : "Weather service returned " + r.status,
      );
    const d = await r.json();
    if (d.error) throw Error(d.reason || "Provider error");
    return d;
  } finally {
    clearTimeout(timer);
  }
}
