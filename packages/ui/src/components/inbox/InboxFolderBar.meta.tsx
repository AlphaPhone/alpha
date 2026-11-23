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
      const canvas = within(canvasElement);
      await expect(canvas.getByRole("button", { name: "Spam" })).toBeDisabled();
      await expect(canvas.getByRole("button", { name: "Trash" })).toBeDisabled();
      await expect(onChoose.mock.calls.length).toBe(0);
    },
  },
};
