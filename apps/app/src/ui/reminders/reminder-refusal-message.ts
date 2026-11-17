import type { ReminderRefusal } from "@elizaos/plugin-assistant/device-actions/reminder-journal";

/** Specific, stable reason for a definite refusal. Nothing was saved in every case. */
export function reminderRefusalMessage(
  status: ReminderRefusal,
  host: { appName: string; settingsName: string },
): string {
  switch (status) {
    case "past":
      return "This reminder time has passed. Choose a future time. Nothing was saved.";
    case "permission-denied":
      return `Notifications are off for ${host.appName}. Enable them in ${host.settingsName}, then save again. Nothing was saved.`;
    case "storage-full":
      return "Reminder storage is full. Complete or delete a reminder, then save again. Nothing was saved.";
    default:
      return "This reminder could not be saved. Check its title and time, then save again. Nothing was saved.";
  }
}
