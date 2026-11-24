import type { ComponentMeta } from "vibestack/stories";
import type { TimersPanelProps } from "./TimersPanel.tsx";
import { ringer, timers } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<TimersPanelProps> = {
  args: { timers, now: ringer.now, onStart: none, onTimer: none, onDismiss: none },
  examples: { Empty: { timers: { timers: [], revisions: 0 } } },
};
