import { state } from "./state.js";
import { radar } from "../ui/radarView.js";
import { Store } from "../storage/storage.js";
import { loadWeather } from "../weather/forecast.js";
import { status } from "../ui/status.js";
import { $ } from "../ui/format.js";
export function selectLocation(l) {
  state.radarRequest++;
  state.radar = null;
  state.radarBusy = false;
  state.radarError = "";
  state.gpsMessage = "";
  state.history = null;
  state.compare = null;
  state.histBusy = false;
  state.location = {
    name: l.name,
    latitude: l.latitude,
    longitude: l.longitude,
    country: l.country || "",
    timezone: l.timezone || "Europe/Vienna",
  };
  Store.set("location", state.location);
  state.view = "weather";
  state.search = [];
  loadWeather();
  if (state.radarOpened) radar();
}
export function locationMessage(text) {
  state.gpsMessage = text;
  status(text, true);
  if ($("locationMessage")) $("locationMessage").textContent = text;
}
export async function gps() {
  if (!navigator.geolocation) {
    locationMessage(
      "GPS is unavailable in this browser context. Use the location field or a saved place.",
    );
    return;
  }
  locationMessage("Requesting your location…");
  let finished = false;
  const watchdog = setTimeout(() => {
    if (!finished) {
      finished = true;
      locationMessage(
        "Location did not respond. Use the search field, or open the HTTPS app and allow location in iPhone settings.",
      );
    }
  }, 14000);
  const done = (fn) => (value) => {
    if (finished) return;
    finished = true;
    clearTimeout(watchdog);
    fn(value);
  };
  try {
    navigator.geolocation.getCurrentPosition(
      done((p) =>
        selectLocation({
          name:
            "My location · " +
            p.coords.latitude.toFixed(2) +
            "°, " +
            p.coords.longitude.toFixed(2) +
            "°",
          latitude: +p.coords.latitude.toFixed(4),
          longitude: +p.coords.longitude.toFixed(4),
          country: "",
          timezone: "Europe/Vienna",
        }),
      ),
      done((e) =>
        locationMessage(
          e.code === 1
            ? "Location permission was denied or blocked for this file. Search above, select a saved place, or use the HTTPS app."
            : "Location could not be obtained. Search above or select a saved place.",
        ),
      ),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  } catch {
    finished = true;
    clearTimeout(watchdog);
    locationMessage(
      "This browser cannot request location here. Use the search field or a saved place.",
    );
  }
}
