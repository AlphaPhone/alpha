import type { ComponentMeta } from "vibestack/stories";
import { Select, SelectContent, SelectItem, type SelectTriggerProps, SelectValue } from "./Select.tsx";

export const meta: ComponentMeta<SelectTriggerProps> = {
  args: { "aria-label": "Ringtone", children: <SelectValue placeholder="Choose a ringtone" /> },
  decorator: (story) => (
    <Select defaultValue="chime" onValueChange={() => undefined}>
      {story()}
      <SelectContent>
        <SelectItem value="aurora">Aurora</SelectItem>
        <SelectItem value="chime">Chime</SelectItem>
        <SelectItem value="drift">Drift</SelectItem>
      </SelectContent>
    </Select>
  ),
};
