import type { ComponentMeta } from "vibestack/stories";
import type { ClockScreenProps } from "./ClockScreen.tsx";

const none = () => undefined;

export const meta: ComponentMeta<ClockScreenProps> = {
  args: { onClose: none },
  examples: {
    Timers: { route: "timers" },
    Stopwatch: { route: "stopwatch" },
    World: { route: "world" },
  },
};
