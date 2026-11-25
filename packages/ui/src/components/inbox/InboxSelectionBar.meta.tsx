import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxSelectionBarProps } from "./InboxSelectionBar.tsx";

const onArchive = fn();
const onTrash = fn();

export const meta: ComponentMeta<InboxSelectionBarProps> = {
  args: { count: 3, onArchive, onTrash },
  examples: {
    One: { count: 1 },
    "Cannot change the mailbox": { onArchive: undefined, onTrash: undefined },
    "In Archive": { onArchive: undefined, onRestore: fn() },
    "Some not chosen": { onChooseAll: fn() },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onArchive.mockClear();
      onTrash.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Archive" }));
      await userEvent.click(canvas.getByRole("button", { name: "Move to Trash" }));
      await expect([onArchive.mock.calls.length, onTrash.mock.calls.length]).toEqual([1, 1]);
    },
  },
};
