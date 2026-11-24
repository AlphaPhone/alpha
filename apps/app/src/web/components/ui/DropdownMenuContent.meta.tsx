import { BellOff, Ellipsis, Pin, Share2, Trash2 } from "lucide-react";
import type { ComponentMeta } from "vibestack/stories";
import { Button } from "./Button.tsx";
import { DropdownMenu, type DropdownMenuContentProps, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./DropdownMenu.tsx";

const noop = () => undefined;

export const meta: ComponentMeta<DropdownMenuContentProps> = {
  args: {
    children: (
      <>
        <DropdownMenuItem onSelect={noop}><Pin aria-hidden className="size-4" />Pin</DropdownMenuItem>
        <DropdownMenuItem onSelect={noop}><Share2 aria-hidden className="size-4" />Share</DropdownMenuItem>
        <DropdownMenuItem onSelect={noop}><BellOff aria-hidden className="size-4" />Mute</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={noop}><Trash2 aria-hidden className="size-4" />Delete</DropdownMenuItem>
      </>
    ),
  },
  examples: {
    "With disabled": {
      children: (
        <>
          <DropdownMenuItem onSelect={noop}>Pin</DropdownMenuItem>
          <DropdownMenuItem disabled onSelect={noop}>Share</DropdownMenuItem>
          <DropdownMenuItem onSelect={noop}>Mute</DropdownMenuItem>
        </>
      ),
    },
    Long: {
      children: Array.from({ length: 12 }, (_, at) => (
        <DropdownMenuItem key={at} onSelect={noop}>Move to folder {at + 1}</DropdownMenuItem>
      )),
    },
  },
  decorator: (story) => (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="More"><Ellipsis aria-hidden className="size-4" /></Button>
      </DropdownMenuTrigger>
      {story()}
    </DropdownMenu>
  ),
};
