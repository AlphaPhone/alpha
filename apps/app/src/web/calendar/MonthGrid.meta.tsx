import type { ComponentMeta } from "vibestack/stories";
import type { MonthGridProps } from "./MonthGrid.tsx";
import { now, rows } from "./fixtures.ts";

export const meta: ComponentMeta<MonthGridProps> = {
  args: { rows, day: 0, month: 0, zone: "UTC", now, onPickDay: () => undefined, onMonth: () => undefined },
  examples: { NextMonth: { rows, day: 0, month: 1, zone: "UTC", now, onPickDay: () => undefined, onMonth: () => undefined } },
};
