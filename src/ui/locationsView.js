import { Store } from "../storage/storage.js";
import { esc } from "./format.js";
import { state, DEFAULT } from "../app/state.js";
export function locationControls() {
  const fav = Store.get("favorites", []);
  return (
    '<section class="card location-controls"><form id="searchForm"><input id="searchInput" placeholder="Town, postcode or lat, lon" minlength="2" required aria-label="Location search" autocomplete="off"><button type="submit">Find</button></form><div id="searchMessage" role="status"></div><div id="searchResults">' +
    searchResults() +
    '</div><div class="actions"><select id="savedLocation" aria-label="Saved locations" style="flex:1;min-width:0"><option value="">Saved places' +
    (fav.length ? "" : " · none yet") +
    "</option>" +
    fav
      .map((l, i) => '<option value="' + i + '">' + esc(l.name) + "</option>")
      .join("") +
    '</select><button data-action="favorite">Save place</button></div><p class="footnote" id="locationMessage" role="status">' +
    esc(
      state.gpsMessage ||
        (location.protocol === "file:"
          ? "Local file: if GPS is unavailable, search above or choose a saved place."
          : ""),
    ) +
    '</p><button data-action="locationHelp">Location help</button></section>'
  );
}
export function locationsView() {
  const fav = Store.get("favorites", []);
  return (
    '<h2 class="headline">Your places</h2><section class="card"><button data-action="gps" style="width:100%">⌖ Use my current location</button><form id="searchForm"><input id="searchInput" placeholder="Town, city or postcode" minlength="2" required autocomplete="off" aria-label="Search locations"><button>Search</button></form><div id="searchMessage" role="status"></div><div id="searchResults">' +
    searchResults() +
    '</div><p id="locationMessage" role="status" class="footnote">' +
    esc(state.gpsMessage || "") +
    '</p><button data-action="locationHelp">Location help</button><p class="footnote">Location is requested only when you tap the button. Coordinates are sent to weather providers to retrieve your weather.</p></section><section class="card"><div class="sectionhead"><h2>Saved locations</h2><button data-action="favorite">Save current</button></div>' +
    (fav.length
      ? fav
          .map(
            (l, i) =>
              '<div class="locationrow"><button class="selectloc" data-fav="' +
              i +
              '">' +
              esc(l.name) +
              "<br><small>" +
              esc(l.country || "") +
              '</small></button><button data-delete="' +
              i +
              '" aria-label="Delete ' +
              esc(l.name) +
              '">×</button></div>',
          )
          .join("")
      : '<p class="muted">Save places to switch between them quickly.</p>') +
    '</section><section class="card"><h3>Quick start · Austria</h3>' +
    [
      { ...DEFAULT },
      { name: "Vienna", latitude: 48.2082, longitude: 16.3738 },
      { name: "Salzburg", latitude: 47.8095, longitude: 13.055 },
      { name: "Innsbruck", latitude: 47.2692, longitude: 11.4041 },
    ]
      .map(
        (l, i) =>
          '<button data-quick="' +
          i +
          '" style="margin:8px 8px 0 0">' +
          l.name +
          "</button>",
      )
      .join("") +
    "</section>"
  );
}
export function searchResults() {
  return (
    (state.search.some((l) => l.postcode)
      ? '<p class="footnote">Approximate locality coordinates · Austrian postcodes: <a href="https://www.geonames.org/" target="_blank" rel="noopener">GeoNames</a> · CC BY 4.0</p>'
      : "") +
    state.search
      .map(
        (l, i) =>
          '<button class="selectloc" style="width:100%;text-align:left;margin-top:8px" data-search="' +
          i +
          '">' +
          esc(l.name) +
          "<br><small>" +
          esc([l.admin1, l.country].filter(Boolean).join(", ")) +
          "</small></button>",
      )
      .join("")
  );
}
