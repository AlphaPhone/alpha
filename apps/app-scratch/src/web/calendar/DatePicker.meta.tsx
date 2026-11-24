import type { ComponentMeta } from "vibestack/stories";
import type { DatePickerProps } from "./DatePicker.tsx";
import { now, rows } from "./fixtures.ts";

const handlers = { onMonth: () => undefined, onPickDay: () => undefined, onClose: () => undefined };

export const meta: ComponentMeta<DatePickerProps> = {
  args: { open: true, rows, day: 0, month: 0, zone: "UTC", now, ...handlers },
  examples: {
    NextMonth: { open: true, rows, day: 0, month: 1, zone: "UTC", now, ...handlers },
    OtherZone: { open: true, rows, day: 3, month: 0, zone: "Pacific/Auckland", now, ...handlers },
  },
};
