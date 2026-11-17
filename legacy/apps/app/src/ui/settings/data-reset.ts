/**
 * What Settings shows after asking for the native data reset (`reset.DataResetPlugin` on
 * Android, through the shared `@elizaos/capacitor-system/reset` bridge shape).
 *
 * The renderer only asks for the native review. It carries no reset authority: the native
 * disclosure and a fresh Android device-credential confirmation decide, and a confirmed reset
 * stops the app instead of resolving. This module never reports a completed deletion, and it
 * claims nothing was erased only for a result the native side sends before any reset is
 * recorded. A reset that could not be prepared after the owner confirmed it may still go ahead
 * (the plugin dispatches a recorded reset in that branch), so that notice says so.
 *
 * The native plugin answers with the shared `DataResetCopy` sentences (built for the product
 * name "Alpha"). Each one is worded by Alpha below; the native text is never shown.
 */
import type { DataResetPlugin } from "@elizaos/capacitor-system/reset";

/** Native outcomes that reach the renderer. Neither one reports a completed deletion. */
type DataResetReviewStatus = "cancelled" | "unavailable";

interface DataResetReviewResult {
  status: DataResetReviewStatus;
  /** Alpha's sentence for the outcome, or null for a plain cancel the owner chose. */
  notice: string | null;
}

/**
 * Shown when the review could not open, its result was malformed or its sentence is unknown.
 * Such an answer does not say whether a reset was recorded, so it makes no claim about erasure.
 */
export const DATA_RESET_UNCONFIRMED = "Reset isn’t available right now.";

/**
 * Keyed by every `DataResetCopy` result sentence `DataResetPlugin.review` resolves with, for the
 * product name "Alpha". A null value is a cancel the owner chose, which needs no notice.
 */
export const DATA_RESET_OUTCOMES: ReadonlyMap<string, string | null> = new Map([
  ["Reset review closed. Nothing reset.", null],
  ["Nothing reset.", null],
  ["Reset cancelled. Nothing reset.", null],
  ["A reset review is already open.", "The reset review is already open. Nothing was erased."],
  ["Reset review expired. Nothing reset.", "The reset review expired. Nothing was erased."],
  [
    "Set a device screen lock in Android before resetting Alpha data.",
    "Set a screen lock in Android Settings before erasing Alpha’s data. Nothing was erased.",
  ],
  [
    "Device authentication is unavailable. Nothing reset.",
    "Unlocking with your screen lock isn’t available. Nothing was erased.",
  ],
  [
    "Reset could not be prepared. Close and reopen Alpha before trying again.",
    "Reset couldn’t be prepared, and the reset you confirmed may still go ahead. Close and reopen Alpha before trying again.",
  ],
  [
    "The listener is off or can't be reached, so nothing was reset. Turn it on in Android Settings and try again.",
    "Always-on listening is off or can’t be reached, so nothing was erased. Turn it on in Android Settings and try again.",
  ],
]);

/**
 * Opens the native review and returns Alpha's wording of its result. A rejected call, a
 * malformed answer, an unknown sentence or any status other than the two the native side sends
 * reads as unavailable; nothing here can turn a renderer value into a claim that data was erased.
 */
export async function reviewDataReset(
  plugin: DataResetPlugin | null | undefined,
): Promise<DataResetReviewResult> {
  if (!plugin) return { status: "unavailable", notice: DATA_RESET_UNCONFIRMED };
  try {
    const value = await plugin.review();
    const status = value?.status;
    const message = typeof value?.message === "string" ? value.message.trim() : "";
    if ((status === "cancelled" || status === "unavailable") && DATA_RESET_OUTCOMES.has(message)) {
      const notice = DATA_RESET_OUTCOMES.get(message) ?? null;
      return { status, notice: status === "cancelled" ? notice : notice ?? DATA_RESET_UNCONFIRMED };
    }
  } catch {
    // A rejected review is treated like a malformed one below.
  }
  return { status: "unavailable", notice: DATA_RESET_UNCONFIRMED };
}
