import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { choosing } from "./fixtures.ts";
import type { ReviewRowsViewProps } from "./ReviewRowsView.tsx";

export const meta: ComponentMeta<ReviewRowsViewProps> = {
  args: { actions: choosing, details: {}, onChoose: fn(), onDismiss: fn() },
  play: {
    Default: async ({ canvasElement, args }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: /Call Maya Ortiz/ }));
      await expect(args.onChoose).toHaveBeenCalledWith("8:4155550111");
    },
  },
};
