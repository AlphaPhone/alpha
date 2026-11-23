import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { restoredCard, restoredWordless } from "./fixtures.ts";
import type { RestoredProposalProps } from "./RestoredProposal.tsx";

export const meta: ComponentMeta<RestoredProposalProps> = {
  args: { card: restoredCard, onDismiss: fn() },
  examples: { Wordless: { card: restoredWordless }, Live: { card: { ...restoredCard, live: true } } },
  play: {
    Default: async ({ canvasElement, args }) => {
      const card = within(canvasElement);
      await expect(card.getByText("Call Maya Chen")).toBeVisible();
      await expect(card.queryByRole("button", { name: /call|approve/i })).toBeNull();
      await userEvent.click(card.getByRole("button", { name: "Dismiss" }));
      await expect(args.onDismiss).toHaveBeenCalledWith("p1");
    },
    Wordless: async ({ canvasElement }) => {
      await expect(within(canvasElement).getByText("Alpha's suggestion")).toBeVisible();
    },
    Live: async ({ canvasElement }) => {
      await expect(within(canvasElement).queryByRole("status")).toBeNull();
    },
  },
};
