import type { ComponentProps } from "react";
import type { ComponentMeta } from "vibestack/stories";
import { type Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Select.tsx";

export const meta: ComponentMeta<ComponentProps<typeof Select>> = {
  args: {
    defaultValue: "chime",
    onValueChange: () => undefined,
    children: (
      <>
        <SelectTrigger aria-label="Ringtone"><SelectValue placeholder="Choose a ringtone" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="aurora">Aurora</SelectItem>
          <SelectItem value="chime">Chime</SelectItem>
          <SelectItem value="drift">Drift</SelectItem>
        </SelectContent>
      </>
    ),
  },
  examples: { Unchosen: { defaultValue: undefined } },
};
