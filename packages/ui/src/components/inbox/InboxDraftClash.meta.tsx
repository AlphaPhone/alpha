import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxDraftClashProps } from "./InboxDraftClash.tsx";

const onRestoreMine = fn();
const onUseSaved = fn();

export const meta: ComponentMeta<InboxDraftClashProps> = {
  args: { onRestoreMine, onUseSaved },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onRestoreMine.mockClear();
      onUseSaved.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Restore my edits" }));
      await userEvent.click(canvas.getByRole("button", { name: "Use latest saved draft" }));
      await expect([onRestoreMine.mock.calls.length, onUseSaved.mock.calls.length]).toEqual([1, 1]);
    },
  },
};
