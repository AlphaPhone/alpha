import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { DraftBubbleProps } from "./DraftBubble.tsx";
import { alphaDraft } from "./fixtures.ts";

export const meta: ComponentMeta<DraftBubbleProps> = {
  args: { slot: alphaDraft, title: "Maya Chen", canSend: true, onSend: fn(), onEdit: fn(), onText: fn(), onDiscard: fn(), onUndo: fn() },
  examples: { Owner: { slot: { ...alphaDraft, author: "ByOwner", undo: { tag: "NoUndo" } } }, Sending: { slot: { ...alphaDraft, outcome: "Sending" }, canSend: false } },
  play: {
    Default: async ({ canvasElement, args }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Don’t send" }));
      await expect(args.onDiscard).toHaveBeenCalledOnce();
      await expect(args.onSend).not.toHaveBeenCalled();
    },
  },
};
