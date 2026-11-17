/**
 * What an approved agent reminder change says when the phone saved it but could not arrange its
 * notification. The shared reminder contract (`validateReminderResult` in plugin-assistant
 * `reminder-contract.ts`) accepts the device's delivery status as a wire code
 * (`permission-denied`, `scheduling-failed`); Alpha words the code for the change the owner
 * approved and never shows it.
 */

/** Alpha's verb for each reviewed reminder change, keyed on the operation type. */
const REMINDER_CHANGE_DONE: ReadonlyMap<string, string> = new Map([
  ["reminder_create", "Reminder saved"],
  ["reminder_update", "Reminder updated"],
  ["reminder_snooze", "Reminder snoozed"],
  ["reminder_complete", "Reminder completed"],
  ["reminder_read_selected", "Reminder read"],
]);

/** Alpha's clause for each delivery status that leaves a saved reminder without its alert. */
export const REMINDER_DELIVERY_PROBLEMS: ReadonlyMap<string, string> = new Map([
  ["permission-denied", "notifications are disabled"],
  ["scheduling-failed", "notification scheduling failed"],
]);

/**
 * The receipt summary for a saved reminder whose notification could not be arranged, or
 * `undefined` when `status` is not such a delivery status. `approximate` adds that Android
 * delivers reminder alerts at an approximate time.
 */
export function reminderDeliveryProblemText(
  operationType: string,
  status: string,
  { approximate = false }: { approximate?: boolean } = {},
): string | undefined {
  const problem = REMINDER_DELIVERY_PROBLEMS.get(status);
  if (!problem) return undefined;
  const done = REMINDER_CHANGE_DONE.get(operationType) ?? "Reminder changed";
  return `${done}; ${problem}.${approximate ? " Android delivery is approximate." : ""}`;
}
