import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { choosing, choosingChange, reviewChange } from "./fixtures.ts";
import type { ReviewRowsViewProps } from "./ReviewRowsView.tsx";

export const meta: ComponentMeta<ReviewRowsViewProps> = {
  args: { actions: choosing, details: {}, onChoose: fn(), onDismiss: fn() },
  states: { ContactChange: { actions: choosingChange, details: reviewChange } },
  play: {
    Default: async ({ canvasElement, args }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: /Call Maya Ortiz/ }));
      await expect(args.onChoose).toHaveBeenCalledWith("8:4155550111");
    },
    // spec/telephony/actions.md, "A name is looked up on the phone and the owner picks the exact number, even for one match": each line says what the change does to it.
    ContactChange: async ({ canvasElement }) => {
      const row = within(canvasElement).getByRole("button", { name: /Replace Maya Chen/ });
      await expect(row).toHaveAccessibleName("Replace Maya Chen Remove (415) 555-0100 Add (415) 555-0123 Keep maya@example.com");
      await expect(within(row).getByText("(415) 555-0100")).toHaveClass("line-through");
      await expect(within(row).getByText("Replace")).toHaveClass("font-semibold");
    },
  },
};
