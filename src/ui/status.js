import { $, time } from "./format.js";
import { state, settings } from "../app/state.js";
import { Store } from "../storage/storage.js";
export function status(message, error = false) {
  $("status").textContent = message;
  $("status").className = "status" + (error ? " error" : "");
}
export function updated() {
  if (state.error) return status(state.error, true);
  if (state.data) {
    const age = Date.now() - state.data.savedAt;
    status(
      (!navigator.onLine
        ? "Offline · "
        : age > settings.refresh * 60000
          ? "Cached · "
          : "") +
        "Updated " +
        time(state.data.savedAt / 1000) +
        (age > 86400000
          ? " · " +
            time(state.data.savedAt / 1000, { day: "numeric", month: "short" })
          : "") +
        (Store.blocked ? " · Device storage unavailable" : ""),
    );
  }
}
