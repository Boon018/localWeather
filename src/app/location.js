import { state } from "./state.js";
import { radar } from "../ui/radarView.js";
import { Store } from "../storage/storage.js";
import { loadWeather } from "../weather/forecast.js";
import { status } from "../ui/status.js";
import { $ } from "../ui/format.js";
import { validLocation } from "../storage/validate.js";
import { requestLocation } from "../api/geolocation.js";
import { showLocationHelp, closeLocationHelp } from "../ui/locationHelp.js";
let cancelGPS = null;
export function selectLocation(l) {
  if (!validLocation(l)) {
    locationMessage("This location is invalid. Choose another place.");
    return;
  }
  if (cancelGPS) {
    cancelGPS();
    cancelGPS = null;
  }
  state.locationEpoch++;
  state.historyRequest++;
  state.radarRequest++;
  state.radar = null;
  state.radarBusy = false;
  state.radarError = "";
  state.gpsMessage = "";
  state.history = null;
  state.compare = null;
  state.histBusy = false;
  state.busy = false;
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
export function gps() {
  closeLocationHelp();
  if (cancelGPS) cancelGPS();
  if (!navigator.geolocation || location.protocol === "file:") {
    locationMessage(
      "Location is unavailable here. Open the HTTPS app or search a town/postcode.",
    );
    return;
  }
  locationMessage(
    "Requesting your location… Allow the location prompt; this can take up to a minute.",
  );
  const request = ++state.gpsRequest,
    epoch = state.locationEpoch;
  const current = () =>
    request === state.gpsRequest && epoch === state.locationEpoch;
  let pending = true;
  const cancel = requestLocation(
    navigator.geolocation,
    (p) => {
      if (!current()) return;
      pending = false;
      cancelGPS = null;
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
      });
    },
    (e) => {
      if (!current()) return;
      pending = false;
      cancelGPS = null;
      const reason =
        e.code === 1
          ? "Location permission is denied."
          : e.code === 3
            ? "Location did not respond within a minute."
            : "Your device could not obtain a location.";
      locationMessage(
        reason +
          " Open Location help for iOS/Safari settings, or search a postcode.",
      );
      showLocationHelp(reason);
    },
  );
  cancelGPS = pending ? cancel : null;
}
if (typeof document.addEventListener === "function")
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && cancelGPS) {
      cancelGPS();
      cancelGPS = null;
      locationMessage(
        "Location request paused when the app was hidden. Tap the location button to retry.",
      );
    }
  });
