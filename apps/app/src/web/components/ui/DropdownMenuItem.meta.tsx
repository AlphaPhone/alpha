import { Share2 } from "lucide-react";
import type { ComponentMeta } from "vibestack/stories";
import { Button } from "./Button.tsx";
import { DropdownMenu, DropdownMenuContent, type DropdownMenuItemProps, DropdownMenuTrigger } from "./DropdownMenu.tsx";

export const meta: ComponentMeta<DropdownMenuItemProps> = {
  args: { children: <><Share2 aria-hidden className="size-4" />Share</>, onSelect: () => undefined },
  examples: {
    "Text only": { children: "Share" },
    Long: { children: "Move to the folder for receipts and other paperwork from this year" },
  },
  decorator: (story) => (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Note</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>{story()}</DropdownMenuContent>
    </DropdownMenu>
  ),
};
