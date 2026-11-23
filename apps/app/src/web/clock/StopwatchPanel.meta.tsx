import type { ComponentMeta } from "vibestack/stories";
import type { StopwatchPanelProps } from "./StopwatchPanel.tsx";
import { ringer, stopwatch } from "./fixtures.ts";

export const meta: ComponentMeta<StopwatchPanelProps> = {
  args: { watch: stopwatch, now: ringer.now, onAction: () => undefined },
  examples: { Stopped: { watch: { ...stopwatch, running: false, banked: 75_000 } } },
};
