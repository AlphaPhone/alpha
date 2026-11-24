import { Ellipsis, Pin, Share2, Trash2 } from "lucide-react";
import type { ComponentProps } from "react";
import type { ComponentMeta } from "vibestack/stories";
import { Button } from "./Button.tsx";
import { type DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./DropdownMenu.tsx";

const noop = () => undefined;

export const meta: ComponentMeta<ComponentProps<typeof DropdownMenu>> = {
  args: {
    children: (
      <>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More"><Ellipsis aria-hidden className="size-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={noop}><Pin aria-hidden className="size-4" />Pin</DropdownMenuItem>
          <DropdownMenuItem onSelect={noop}><Share2 aria-hidden className="size-4" />Share</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={noop}><Trash2 aria-hidden className="size-4" />Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </>
    ),
  },
};
