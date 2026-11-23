import type { ComponentMeta } from "vibestack/stories";
import type { AlarmsPanelProps } from "./AlarmsPanel.tsx";
import { alarms, ringer } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<AlarmsPanelProps> = {
  args: { clock: alarms, now: ringer.now, onAdd: none, onSnooze: none, onDismiss: none, onSwitch: none, onDelete: none, onSnoozeMinutes: none },
  examples: { Empty: { clock: { alarms: [], snoozeMinutes: 10, revisions: 0 } } },
};
