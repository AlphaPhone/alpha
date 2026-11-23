import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { SuggestionReviewProps } from "./SuggestionReview.tsx";
import { movedSuggestionView, suggestionView } from "./fixtures.ts";

export const meta: ComponentMeta<SuggestionReviewProps> = {
  args: { view: suggestionView, onInsert: fn(), onClose: fn() },
  examples: { Moved: { view: movedSuggestionView }, Closed: { view: undefined } },
  play: {
    Default: async ({ args, canvasElement }: { args: SuggestionReviewProps; canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await expect(canvas.getByText("Thanks, see you at 6.")).toBeTruthy();
      await userEvent.click(canvas.getByRole("button", { name: "Insert" }));
      await expect(args.onInsert).toHaveBeenCalledTimes(1);
    },
    Moved: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("status").textContent).toContain("field changed"),
    Closed: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button")).toBeNull(),
  },
};
