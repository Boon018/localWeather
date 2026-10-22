import postcodes from "../data/austrian-postcodes.json";

// Bare four-digit searches default to Austria. Explicit foreign country searches
// continue to the online geocoder. Keep every locality: one postcode is not a point.
export function austrianPostcodeSearch(query) {
  const match = query
    .trim()
    .match(
      /^(?:(?:AT|A)[-\s]*)?(\d{4})(?:\s*,?\s*(?:Austria|Österreich|AT))?$/i,
    );
  if (!match) return null;
  const code = match[1];
  return (postcodes[code] || [])
    .slice()
    .sort(
      (a, b) => Number(b[4]) - Number(a[4]) || a[0].localeCompare(b[0], "de"),
    )
    .map(([name, admin1, latitude, longitude]) => ({
      name: code + " " + name,
      admin1,
      latitude,
      longitude,
      country: "Austria",
      country_code: "AT",
      timezone: "Europe/Vienna",
      postcode: code,
    }));
}
