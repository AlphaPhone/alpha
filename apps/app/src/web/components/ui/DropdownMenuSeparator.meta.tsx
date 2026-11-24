import type { ComponentProps } from "react";
import type { ComponentMeta } from "vibestack/stories";
import { Button } from "./Button.tsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, type DropdownMenuSeparator, DropdownMenuTrigger } from "./DropdownMenu.tsx";

const noop = () => undefined;

export const meta: ComponentMeta<ComponentProps<typeof DropdownMenuSeparator>> = {
  args: { children: null },
  decorator: (story) => (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Note</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={noop}>Share</DropdownMenuItem>
        {story()}
        <DropdownMenuItem destructive onSelect={noop}>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
