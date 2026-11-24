import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantScreenProps } from "./AssistantScreen.tsx";

export const meta: ComponentMeta<AssistantScreenProps> = {
  args: { route: undefined, onClose: fn() },
  examples: { Activity: { route: "activity" } },
  play: {
    Default: async ({ args, canvasElement }: { args: AssistantScreenProps; canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await expect(canvas.getByRole("heading", { name: "Alpha" })).toBeTruthy();
      await userEvent.click(canvas.getByRole("button", { name: "Back" }));
      await expect(args.onClose).toHaveBeenCalledTimes(1);
    },
    Activity: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("heading", { name: "Agent activity" })).toBeTruthy(),
  },
};
