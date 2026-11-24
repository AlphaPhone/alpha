import type { ComponentMeta } from "vibestack/stories";
import { Button } from "./Button.tsx";
import { Popover, type PopoverContentProps, PopoverTrigger } from "./Popover.tsx";

export const meta: ComponentMeta<PopoverContentProps> = {
  args: {
    "aria-label": "Unknown callers",
    children: <p className="text-sm">Calls from numbers that are not in your contacts ring silently and go to voicemail.</p>,
  },
  examples: {
    Long: {
      children: (
        <div className="grid gap-2 text-sm">
          <p className="font-medium">How Alpha screens calls</p>
          <p>Alpha answers calls from numbers that are not in your contacts, asks who is calling and why, and shows you the answer before your phone rings.</p>
          <p>Calls it cannot identify go to voicemail, and you can read a transcript of each one in the call history.</p>
        </div>
      ),
    },
  },
  decorator: (story) => (
    <Popover defaultOpen>
      <PopoverTrigger asChild>
        <Button variant="outline">Unknown callers</Button>
      </PopoverTrigger>
      {story()}
    </Popover>
  ),
};
