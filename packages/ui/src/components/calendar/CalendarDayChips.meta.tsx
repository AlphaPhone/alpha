import type { ComponentMeta } from "vibestack/stories";
import type { CalendarDayChips } from "./CalendarForm.tsx";

type Props = Parameters<typeof CalendarDayChips>[0];

export const meta: ComponentMeta<Props> = {
  args: {
    days: [
      { key: 1, top: "Today", date: 24, label: "Today", chosen: true, onPick: () => undefined },
      { key: 2, top: "Wed", date: 25, label: "Tomorrow", chosen: false, onPick: () => undefined },
      { key: 3, top: "Thu", date: 26, label: "Thu, Nov 26", chosen: false, onPick: () => undefined },
    ],
  },
};
