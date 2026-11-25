import type { ComponentMeta } from "vibestack/stories";
import type { CalendarTimelineProps } from "./CalendarTimeline.tsx";

export const meta: ComponentMeta<CalendarTimelineProps> = {
  args: {
    hours: Array.from({ length: 17 }, (_, at) => ({ hour: 7 + at, label: `${((6 + at) % 12) + 1} ${7 + at < 12 ? "AM" : "PM"}` })),
    blocks: [
      { key: 1, title: "Standup", time: "9:30", label: "Standup, 9:30", start: 9.5, length: 0.5, lane: 0, lanes: 1, stripe: "primary", onOpen: () => undefined },
      { key: 2, title: "Lunch", sub: "Tartine, Guerrero St", time: "1:00", label: "Lunch, 1:00", start: 13, length: 1, lane: 0, lanes: 1, stripe: "foreground", onOpen: () => undefined },
    ],
    now: 15.5,
  },
  examples: {
    Empty: { blocks: [], empty: "Free all day" },
  },
};
