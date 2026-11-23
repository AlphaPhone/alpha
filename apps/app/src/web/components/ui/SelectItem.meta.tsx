import type { ComponentMeta } from "vibestack/stories";
import { Select, SelectContent, type SelectItemProps, SelectTrigger, SelectValue } from "./Select.tsx";

export const meta: ComponentMeta<SelectItemProps> = {
  args: { value: "chime", children: "Chime" },
  examples: {
    Unselected: { value: "aurora", children: "Aurora" },
    Long: { value: "morning", children: "Morning birdsong with a slow rise in volume over thirty seconds" },
  },
  decorator: (story) => (
    <Select defaultValue="chime" defaultOpen onValueChange={() => undefined}>
      <SelectTrigger aria-label="Ringtone"><SelectValue placeholder="Choose a ringtone" /></SelectTrigger>
      <SelectContent>{story()}</SelectContent>
    </Select>
  ),
};
