import type { ComponentMeta } from "vibestack/stories";
import type { ScheduleListProps } from "./ScheduleList.tsx";
import { groups } from "./fixtures.ts";

export const meta: ComponentMeta<ScheduleListProps> = {
  args: { groups, range: "Through Jan 31, 2027", emptyText: "No upcoming events", onOpen: () => undefined },
  examples: { Empty: { groups: [], range: "Searching Oct 1, 2026 – Jan 31, 2027", emptyText: "No matching events", onOpen: () => undefined } },
};
