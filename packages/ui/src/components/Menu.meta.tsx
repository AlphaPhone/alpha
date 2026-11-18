import { EllipsisVertical, FolderInput, Share2, Trash2 } from "lucide-react";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { Button } from "./Button.tsx";
import { ListRow } from "./ListRow.tsx";
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

const row = (
  <>
    <MenuTrigger asChild>
      <ListRow title="Sort by" detail="Date" />
    </MenuTrigger>
    <MenuContent align="start">
      <MenuItem onSelect={onShare}>Date</MenuItem>
      <MenuItem>Title</MenuItem>
    </MenuContent>
  </>
);

export const meta: ComponentMeta<MenuProps> = {
  args: { children },
  examples: { "Row trigger": { children: row } },
  play: {
    "Row trigger": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onShare.mockClear();
      const trigger = within(canvasElement).getByRole("button", { name: /Sort by/ });
      await expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
      trigger.focus();
      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Date" })));
      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect([onShare.mock.calls.length, screen.queryByRole("menu"), document.activeElement]).toEqual([1, null, trigger]));
    },
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
