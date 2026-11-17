import { EllipsisVertical, FolderInput, Share2, Trash2 } from "lucide-react";
import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { Button } from "./Button.tsx";
import { MenuContent, MenuItem, type MenuProps, MenuTrigger } from "./Menu.tsx";

const onShare = fn();
const children = (
  <>
    <MenuTrigger asChild>
      <Button variant="ghost" size="icon" aria-label="More">
        <EllipsisVertical />
      </Button>
    </MenuTrigger>
    <MenuContent>
      <MenuItem onSelect={onShare}><Share2 aria-hidden />Share</MenuItem>
      <MenuItem><FolderInput aria-hidden />Move to</MenuItem>
      <MenuItem destructive><Trash2 aria-hidden />Delete</MenuItem>
    </MenuContent>
  </>
);

export const meta: ComponentMeta<MenuProps> = {
  args: { children },
  play: {
    Default: async () => {
      onShare.mockClear();
      const trigger = screen.getByRole("button", { name: "More" });
      trigger.focus();
      await userEvent.keyboard("{Enter}");
      await expect(await screen.findByRole("menu")).toBeTruthy();
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Share" })));
      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect([onShare.mock.calls.length, screen.queryByRole("menu"), document.activeElement]).toEqual([1, null, trigger]));
    },
  },
};
