import { $, finite } from "../ui/format.js";
import { Store } from "../storage/storage.js";
import { selectLocation } from "./location.js";
import { Provider } from "../api/openMeteo.js";
import { state, settings } from "./state.js";
import { searchResults } from "../ui/locationsView.js";
import { getHistory } from "../weather/history.js";
import { render } from "./navigation.js";
import { drawChart } from "../ui/charts.js";
import { radarImages } from "../ui/radarView.js";
export function bind() {
  if ($("savedLocation"))
    $("savedLocation").onchange = () => {
      const value = $("savedLocation").value;
      if (value !== "") {
        const l = Store.get("favorites", [])[+value];
        if (l) selectLocation(l);
      }
    };
  const form = $("searchForm");
  if (form)
    form.onsubmit = async (e) => {
      e.preventDefault();
      const q = $("searchInput").value.trim();
      if (q.length < 2) return;
      const coords = q.match(
        /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/,
      );
      if (coords) {
        const lat = +coords[1],
          lon = +coords[2];
        if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
          selectLocation({
            name: lat.toFixed(3) + "°, " + lon.toFixed(3) + "°",
            latitude: lat,
            longitude: lon,
          });
          return;
        }
        $("searchMessage").textContent =
          "Coordinates must be latitude −90 to 90, longitude −180 to 180.";
        return;
      }
      const button = form.querySelector("button");
      button.disabled = true;
      $("searchMessage").textContent = "Searching…";
      try {
        const d = await Provider.search(q);
        state.search = (d.results || []).filter(
          (l) => finite(l.latitude) && finite(l.longitude),
        );
        state.search.sort(
          (a, b) => (b.country_code === "AT") - (a.country_code === "AT"),
        );
        if ($("searchResults")) {
          $("searchResults").innerHTML = searchResults();
          $("searchMessage").textContent = state.search.length
            ? ""
            : "No locations found. Try a nearby town.";
        }
      } catch (e) {
        if ($("searchMessage"))
          $("searchMessage").textContent =
            "Search unavailable. Try a saved location.";
      } finally {
        button.disabled = false;
      }
    };
  if ($("historyForm"))
    $("historyForm").onsubmit = (e) => {
      e.preventDefault();
      getHistory($("historyDate").value);
    };
  for (const k of ["theme", "temperature", "wind", "precipitation"])
    if ($(k))
      $(k).onchange = () => {
        settings[k] = $(k).value;
        Store.set("settings", settings);
        render();
      };
  if ($("refreshSetting"))
    $("refreshSetting").onchange = () => {
      settings.refresh = +$("refreshSetting").value;
      Store.set("settings", settings);
    };
  if ($("chartVar"))
    $("chartVar").onchange = () => {
      state.chartVar = $("chartVar").value;
      drawChart();
    };
  if ($("chartHours"))
    $("chartHours").onchange = () => {
      state.chartHours = +$("chartHours").value;
      render();
    };
  if ($("radarTime"))
    $("radarTime").oninput = () => {
      state.radarIndex = +$("radarTime").value;
      radarImages();
    };
  radarImages();
}
