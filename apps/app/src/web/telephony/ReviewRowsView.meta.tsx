import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { changeDetails, choosing, choosingChange } from "./fixtures.ts";
import type { ReviewRowsViewProps } from "./ReviewRowsView.tsx";

export const meta: ComponentMeta<ReviewRowsViewProps> = {
  args: { actions: choosing, details: {}, onChoose: fn(), onDismiss: fn() },
  examples: {
    ContactChange: { actions: choosingChange, details: changeDetails },
  },
  play: {
    Default: async ({ canvasElement, args }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: /Call Maya Ortiz/ }));
      await expect(args.onChoose).toHaveBeenCalledWith("8:4155550111");
    },
    ContactChange: async ({ canvasElement }) => {
      const canvas = within(canvasElement);
      const removed = canvas.getByText("Remove (415) 555-0100");
      await expect(removed.className).toMatch(/line-through/);
      await expect(canvas.getByText("Rename from Test Alpha").className).toMatch(/line-through/);
      await expect(canvas.getByText("Add (415) 555-0101").className).toMatch(/font-semibold/);
      await expect(canvas.getByText("Keep ta@example.com").className).not.toMatch(/line-through|truncate/);
    },
  },
};
