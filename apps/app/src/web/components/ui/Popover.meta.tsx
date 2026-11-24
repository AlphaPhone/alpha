import type { ComponentProps } from "react";
import type { ComponentMeta } from "vibestack/stories";
import { Button } from "./Button.tsx";
import { type Popover, PopoverContent, PopoverTrigger } from "./Popover.tsx";

export const meta: ComponentMeta<ComponentProps<typeof Popover>> = {
  args: {
    children: (
      <>
        <PopoverTrigger asChild>
          <Button variant="outline">Unknown callers</Button>
        </PopoverTrigger>
        <PopoverContent aria-label="Unknown callers">
          <p className="text-sm">Calls from numbers that are not in your contacts ring silently and go to voicemail.</p>
        </PopoverContent>
      </>
    ),
  },
};
