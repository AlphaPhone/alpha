import { MicOff } from "lucide-react";
import type { ComponentProps } from "react";
import type { ComponentMeta } from "vibestack/stories";
import { Button } from "./Button.tsx";
import { type Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./Tooltip.tsx";

export const meta: ComponentMeta<ComponentProps<typeof Tooltip>> = {
  args: {
    children: (
      <>
        <TooltipTrigger asChild>
          <Button variant="secondary" size="icon" aria-label="Mute"><MicOff aria-hidden className="size-4" /></Button>
        </TooltipTrigger>
        <TooltipContent>Mute</TooltipContent>
      </>
    ),
  },
  decorator: (story) => <TooltipProvider>{story()}</TooltipProvider>,
};
