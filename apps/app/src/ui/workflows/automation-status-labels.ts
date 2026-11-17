/**
 * The status word an Automations row shows. Each source answers with its own status identifier:
 * the agent's automation list (`AutomationStatus` in `plugins/plugin-workflow/src/lib/automations-types.ts`),
 * its scheduled tasks (`ScheduledTaskStatus` in `plugins/plugin-scheduling/src/scheduled-task/types.ts`),
 * its routines and goals (`LIFEOPS_DEFINITION_STATUSES` in `packages/contracts/src/lifeops/scheduling.ts`),
 * Alpha's reminder delivery label (`utils/reminder-presentation.ts`) and the phone's own reminders
 * (`Reminder.status` in `daily.ts`). Alpha words every identifier here; an identifier it has no
 * word for reads as {@link UNKNOWN_STATUS}, never as the identifier itself.
 */

export const UNKNOWN_STATUS = "Unknown";

/** Keyed by every status identifier an Automations row can carry. */
export const AUTOMATION_STATUS_LABELS: ReadonlyMap<string, string> = new Map([
  // Agent automations (AutomationStatus).
  ["active", "Active"],
  ["paused", "Paused"],
  ["completed", "Completed"],
  ["draft", "Draft"],
  ["system", "System"],
  // Agent scheduled tasks (ScheduledTaskStatus); "snoozed" is Alpha's own projection of a deferral.
  ["scheduled", "Scheduled"],
  ["fired", "Sent"],
  ["acknowledged", "Acknowledged"],
  ["skipped", "Skipped"],
  ["expired", "Expired"],
  ["failed", "Failed"],
  ["dismissed", "Dismissed"],
  ["snoozed", "Snoozed"],
  // Routines and goals (LIFEOPS_DEFINITION_STATUSES).
  ["archived", "Archived"],
  // Agent reminders (reminderDeliveryLabel).
  ["cancelled", "Cancelled"],
  ["muted", "Muted"],
  ["delivered", "Delivered"],
  ["blocked", "Delivery blocked"],
  ["duplicate", "Duplicate skipped"],
  ["unknown", UNKNOWN_STATUS],
  ["unscheduled", "—"],
  // Reminders on this phone (Reminder.status).
  ["pending", "Pending"],
  ["posted", "Shown"],
  ["permission-denied", "Notifications not allowed"],
  ["scheduling-failed", "Couldn’t schedule"],
]);

/**
 * Alpha's word for a row's status. A scheduled item snoozed until later shows no word (its
 * schedule line says when); a row without a status shows whether it is on.
 */
export function automationStatusLabel(row: { kind: string; status: string; enabled: boolean }): string {
  if (row.kind === "schedule" && row.status === "snoozed") return "";
  if (!row.status) return row.enabled ? "Active" : "Inactive";
  return AUTOMATION_STATUS_LABELS.get(row.status) ?? AUTOMATION_STATUS_LABELS.get(row.status.toLowerCase()) ?? UNKNOWN_STATUS;
}
