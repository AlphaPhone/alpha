import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { NavigationPillProps } from "./NavigationPill.tsx";

export const meta: ComponentMeta<NavigationPillProps> = {
  args: { label: "26 min", onOpen: fn() },
  examples: { Arrived: { label: "Arrived" } },
  play: {
    Default: async ({ canvasElement, args }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Navigation, 26 min" }));
      await expect(args.onOpen).toHaveBeenCalled();
    },
  },
};
