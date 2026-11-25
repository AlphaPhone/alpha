import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { ReactionBarProps } from "./ReactionBar.tsx";

const onToggle = fn();
const onAdd = fn();

export const meta: ComponentMeta<ReactionBarProps> = {
  args: {
    reactions: [
      { emoji: "👍", count: 3, reacted: true, label: "Thumbs up" },
      { emoji: "🎉", count: 1, reacted: false, label: "Party" },
    ],
    onToggle,
    onAdd,
  },
  examples: {
    "Empty with add": { reactions: [], onAdd },
    Disabled: { disabled: true },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onToggle.mockClear();
      onAdd.mockClear();
      const canvas = within(canvasElement);
      const thumbs = canvas.getByRole("button", { name: "Thumbs up, 3" });
      await expect(thumbs).toHaveAttribute("aria-pressed", "true");
      await userEvent.click(thumbs);
      await userEvent.click(canvas.getByRole("button", { name: "Add reaction" }));
      await expect([onToggle.mock.calls, onAdd.mock.calls.length]).toEqual([[["👍"]], 1]);
    },
  },
};
