import { $ } from "./format.js";
export function showLocationHelp(
  reason = "Follow these steps, then tap Try location again.",
) {
  const dialog = $("locationHelp");
  if (!dialog || typeof dialog.showModal !== "function") return;
  $("locationHelpReason").textContent = reason;
  if (!dialog.open) dialog.showModal();
}
export function closeLocationHelp() {
  const dialog = $("locationHelp");
  if (dialog && typeof dialog.close === "function") dialog.close();
}
