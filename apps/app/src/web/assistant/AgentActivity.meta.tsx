import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AgentActivityProps } from "./AgentActivity.tsx";

export const meta: ComponentMeta<AgentActivityProps> = {
  args: { onBack: fn() },
  play: {
    Default: async ({ args, canvasElement }: { args: AgentActivityProps; canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await expect(canvas.getByRole("region", { name: "Saved conversations" })).toBeTruthy();
      await userEvent.click(canvas.getByRole("button", { name: "Back to chat" }));
      await expect(args.onBack).toHaveBeenCalledTimes(1);
    },
  },
};
