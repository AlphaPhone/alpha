import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxFolderBarProps } from "./InboxFolderBar.tsx";

const onChoose = fn();

export const meta: ComponentMeta<InboxFolderBarProps> = {
  args: { folder: "incoming", onChoose },
  examples: {
    Archive: { folder: "archived" },
    "Spam and Trash unavailable": { unavailable: true },
    "Mail cannot be read": { onChoose: undefined },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onChoose.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Inbox" }));
      await userEvent.click(canvas.getByRole("button", { name: "Sent" }));
      await expect(onChoose.mock.calls).toEqual([["sent"]]);
    },
    "Spam and Trash unavailable": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onChoose.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "More folders" }));
      const page = within(canvasElement.ownerDocument.body);
      await expect(page.getByRole("menuitem", { name: "Spam" })).toHaveAttribute("aria-disabled", "true");
      await expect(page.getByRole("menuitem", { name: "Trash" })).toHaveAttribute("aria-disabled", "true");
      await expect(onChoose.mock.calls.length).toBe(0);
    },
  },
};
