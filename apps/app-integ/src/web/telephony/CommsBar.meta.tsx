import { expect, fn, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { CommsBarProps } from "./CommsBar.tsx";
import { commsAlpha, commsCall, commsThread } from "./fixtures.ts";

export const meta: ComponentMeta<CommsBarProps> = {
  args: { comms: commsThread, person: "Maya Chen", value: "", onText: fn(), onAlpha: fn(), onBack: fn(), onEnd: fn() },
  examples: { AlphaOpen: { comms: commsAlpha }, InCall: { comms: commsCall } },
  play: {
    InCall: async ({ canvasElement }) => {
      await expect(within(canvasElement).getByRole("button", { name: "End call" })).toBeVisible();
    },
    AlphaOpen: async ({ canvasElement }) => {
      const bar = within(canvasElement);
      await expect(bar.getByRole("button", { name: "Back to texting Maya" })).toBeVisible();
      await expect(canvasElement.querySelectorAll("[data-alpha-composer]")).toHaveLength(1);
    },
  },
};
