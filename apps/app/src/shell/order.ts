import type { View } from "../../gen/app__shell.ts";

const listed = {
  Phone: true,
  Messages: true,
  Inbox: true,
  Telegram: true,
  Slack: true,
  Calendar: true,
  Clock: true,
  Reminders: true,
  Browser: true,
  Camera: true,
  Photos: true,
  Maps: true,
  Notes: true,
  Contacts: true,
  Files: true,
  Workflows: true,
  Settings: true,
} satisfies Record<View, true>;

/** Alpha's own views in the order the phone lists them, each once: Phone first, Settings last. */
export const viewOrder = Object.keys(listed) as View[];
