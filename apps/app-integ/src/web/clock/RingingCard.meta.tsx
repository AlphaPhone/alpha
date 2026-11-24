import type { ComponentMeta } from "vibestack/stories";
import type { RingingCardProps } from "./RingingCard.tsx";
import { alarms, sounding, timers } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<RingingCardProps> = {
  args: { ringer: sounding, alarms, timers, onSilence: none, onSnooze: none, onDismiss: none, onStopTimer: none },
};
