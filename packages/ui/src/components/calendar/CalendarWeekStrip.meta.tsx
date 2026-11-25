import type { ComponentMeta } from "vibestack/stories";
import type { CalendarWeekStripProps } from "./CalendarWeekStrip.tsx";

export const meta: ComponentMeta<CalendarWeekStripProps> = {
  args: {
    days: ["M", "T", "W", "T", "F", "S", "S"].map((letter, at) => ({
      key: at, letter, date: 23 + at, label: `Day ${23 + at}`, today: at === 1, selected: at === 1, busy: at < 5, onPick: () => undefined,
    })),
  },
};
