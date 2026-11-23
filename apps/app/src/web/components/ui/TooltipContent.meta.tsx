import { MicOff } from "lucide-react";
import type { ComponentMeta } from "vibestack/stories";
import { Button } from "./Button.tsx";
import { Tooltip, type TooltipContentProps, TooltipProvider, TooltipTrigger } from "./Tooltip.tsx";

export const meta: ComponentMeta<TooltipContentProps> = {
  args: { children: "Mute" },
  examples: { Long: { children: "Mute your microphone; the other person still hears hold music" } },
  decorator: (story) => (
    <TooltipProvider>
      <Tooltip defaultOpen>
        <TooltipTrigger asChild>
          <Button variant="secondary" size="icon" aria-label="Mute"><MicOff aria-hidden className="size-4" /></Button>
        </TooltipTrigger>
        {story()}
      </Tooltip>
    </TooltipProvider>
  ),
};
