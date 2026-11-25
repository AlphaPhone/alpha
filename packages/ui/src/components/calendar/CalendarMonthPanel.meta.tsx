import type { ComponentMeta } from "vibestack/stories";
import type { CalendarMonthPanelProps } from "./CalendarMonthPanel.tsx";

export const meta: ComponentMeta<CalendarMonthPanelProps> = {
  args: {
    month: 10,
    year: 2026,
    months: [{ value: 9, label: "October" }, { value: 10, label: "November" }, { value: 11, label: "December" }],
    years: [{ value: 2026, label: "2026" }, { value: 2027, label: "2027" }],
    onMonth: () => undefined,
    onYear: () => undefined,
    onPrevious: () => undefined,
    onNext: () => undefined,
    onClose: () => undefined,
    days: Array.from({ length: 35 }, (_, at) => ({
      key: at, date: ((at + 25) % 30) + 1, label: `Day ${at}`, outside: at < 6, today: at === 29, busy: at % 3 === 0, onPick: () => undefined,
    })),
  },
};
