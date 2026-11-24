import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { SearchBarProps } from "./SearchBar.tsx";

export const meta: ComponentMeta<SearchBarProps> = {
  args: { query: "", canBack: false, canClear: false, onType: fn(), onSubmit: fn(), onClear: fn(), onLead: fn() },
  examples: {
    Typed: { query: "coffee", canBack: true, canClear: true },
    Long: { query: "x".repeat(300), canBack: true, canClear: true },
  },
  play: {
    Default: async ({ canvasElement }) => {
      await expect(within(canvasElement).queryByRole("button", { name: "Clear search" })).toBeNull();
    },
    Typed: async ({ canvasElement, args }) => {
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Clear search" }));
      await expect(args.onClear).toHaveBeenCalled();
      await userEvent.click(canvas.getByRole("button", { name: "Back" }));
      await expect(args.onLead).toHaveBeenCalled();
    },
    Long: async ({ canvasElement }) => {
      await expect(within(canvasElement).getByRole("textbox", { name: "Search places" })).toHaveAttribute("maxlength", "300");
    },
  },
};
