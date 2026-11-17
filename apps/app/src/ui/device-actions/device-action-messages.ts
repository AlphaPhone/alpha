/**
 * What the owner reads when approving, listing or settling a device action fails before a
 * receipt exists.
 *
 * The approval runs through Alpha's coordinator (`client-coordinator.ts`), which reaches shared
 * code that refuses in its own English: the staged operation validators, whose refusal the
 * coordinator's `pending` rethrows when nothing else is reviewable; the shared Clock review
 * (`clock-handoff.ts`, worded in `../clock/clock-handoff-presentation.ts`); and the native action
 * journal (`plugins/plugin-native-action-journal/android` `ActionJournalPlugin.refusal()`, which
 * `AlphaActionJournalPlugin` inherits). Each is worded here. Alpha's own refusals on that path
 * (the coordinator's and `runtime/connection-ui.tsx`'s plain errors) pass through; a native
 * rejection Alpha has no sentence for reads as the caller's fallback.
 */
import { CLOCK_REVIEW_REFUSALS } from "../clock/clock-handoff-presentation";
import { refusalText } from "../utils/native-refusal";

/** A device action approval that failed for a reason Alpha has no sentence for. */
export const DEVICE_ACTION_FAILED = "Action could not complete.";
/** A pending action the shared operation check refused: the same notice its review card shows. */
export const DEVICE_ACTION_UNAVAILABLE = "This action isn't available on this phone.";
/** The native action journal refused to read or record a step. */
export const ACTION_JOURNAL_REFUSED =
  "The phone’s action history couldn’t be read or updated. Check Agent activity before trying again.";

/** Each reviewed sentence from shared code on the approval path. */
export const DEVICE_ACTION_REFUSALS: ReadonlyMap<string, string> = new Map([
  ...CLOCK_REVIEW_REFUSALS,
  ["Action journal unavailable or transition rejected", ACTION_JOURNAL_REFUSED],
]);

/** Refusals of the shared operation validators, recorded by the coordinator as it rethrows one. */
const validatorRefusals = new WeakSet<object>();
/** Marks `error` as a shared operation validator's refusal and returns it unchanged. */
export function sharedValidatorRefusal<T>(error: T): T {
  if (error && typeof error === "object") validatorRefusals.add(error);
  return error;
}

/**
 * Alpha's sentence for a failed approval or action-history step: a validator refusal reads as
 * {@link DEVICE_ACTION_UNAVAILABLE}, a reviewed shared sentence as its Alpha sentence, a native
 * rejection or non-error as `fallback`, and Alpha's own plain error as it is.
 */
export function deviceActionFailureText(
  error: unknown,
  fallback: string = DEVICE_ACTION_FAILED,
): string {
  if (error && typeof error === "object" && validatorRefusals.has(error))
    return DEVICE_ACTION_UNAVAILABLE;
  return refusalText(error, DEVICE_ACTION_REFUSALS, fallback);
}

/** The Alpha sentence for a reviewed shared sentence on this path, or undefined. */
export function deviceActionRefusal(error: unknown): string | undefined {
  if (error && typeof error === "object" && validatorRefusals.has(error))
    return DEVICE_ACTION_UNAVAILABLE;
  const text = error instanceof Error ? error.message.trim() : "";
  return DEVICE_ACTION_REFUSALS.get(text);
}
