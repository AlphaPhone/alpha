import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { StartupMockBannerProps } from "./StartupMockBanner.tsx";

const onExit = fn();

export const meta: ComponentMeta<StartupMockBannerProps> = {
  args: { onExit },
  examples: { "No way out": { onExit: undefined } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onExit.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Exit mock mode" }));
      await expect(onExit.mock.calls.length).toBe(1);
    },
    "No way out": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button")).toBeNull(),
  },
};
