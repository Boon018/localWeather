import { Store } from "../storage/storage.js";
import { readSettings } from "../storage/validate.js";
export const DEFAULT = {
  name: "Graz",
  latitude: 47.0707,
  longitude: 15.4395,
  country: "Austria",
  timezone: "Europe/Vienna",
};
export const settings = readSettings(
  Object.assign(
    {
      theme: "auto",
      temperature: "celsius",
      wind: "kmh",
      precipitation: "mm",
      refresh: 30,
      defaultLocation: null,
    },
    Store.get("settings", {}),
  ),
);
export const state = {
  location: settings.defaultLocation || Store.get("location", DEFAULT),
  view: "weather",
  data: null,
  busy: false,
  seq: 0,
  historyRequest: 0,
  locationEpoch: 0,
  gpsRequest: 0,
  error: "",
  history: null,
  histDate: "",
  histBusy: false,
  compare: null,
  radar: null,
  radarOpened: false,
  radarMap: null,
  radarIndex: 0,
  radarBusy: false,
  radarError: "",
  radarRequest: 0,
  gpsMessage: "",
  search: [],
  chartVar: "temperature_2m",
  chartHours: 48,
  warnings: null,
};
