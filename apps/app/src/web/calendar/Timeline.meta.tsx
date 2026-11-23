import type { ComponentMeta } from "vibestack/stories";
import type { TimelineProps } from "./Timeline.tsx";
import { now, rows } from "./fixtures.ts";

export const meta: ComponentMeta<TimelineProps> = {
  args: { rows, days: [0], day: 0, zone: "UTC", now, emptyText: "Free", onOpen: () => undefined, onPickDay: () => undefined },
  examples: {
    Week: { rows, days: [-1, 0, 1, 2, 3, 4, 5], day: 0, zone: "UTC", now, emptyText: "Free", onOpen: () => undefined, onPickDay: () => undefined },
    Free: { rows: [], days: [0], day: 0, zone: "UTC", now, emptyText: "Free", onOpen: () => undefined, onPickDay: () => undefined },
    Incomplete: { rows: [], days: [0], day: 0, zone: "UTC", now, emptyText: "Incomplete", onOpen: () => undefined, onPickDay: () => undefined },
  },
};
