import type { ComponentMeta } from "vibestack/stories";
import type { DayPickerProps } from "./DayPicker.tsx";

const none = () => undefined;

export const meta: ComponentMeta<DayPickerProps> = {
  args: { days: [2, 3, 4, 5, 6], onChange: none },
  examples: { OneTime: { days: [] }, Weekends: { days: [1, 7] }, Unsupported: { days: [], disabled: true } },
};
