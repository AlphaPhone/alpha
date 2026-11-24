import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { CallBarViewProps } from "./CallBarView.tsx";
import { activeCall, endedCall, heldWhileRinging, ringingCall } from "./fixtures.ts";

export const meta: ComponentMeta<CallBarViewProps> = {
  args: { bar: activeCall, onReturn: fn(), onEnd: fn() },
  examples: { Ringing: { bar: ringingCall }, HeldWhileRinging: { bar: heldWhileRinging }, Ended: { bar: endedCall } },
  play: {
    // Android's own alert presents the ring; a second call bar would cover or repeat it.
    Ringing: async ({ canvasElement }) => {
      await expect(within(canvasElement).queryByRole("status")).toBeNull();
    },
    HeldWhileRinging: async ({ canvasElement }) => {
      await expect(within(canvasElement).queryByRole("status")).toBeNull();
    },
    Ended: async ({ canvasElement, args }) => {
      const bar = within(canvasElement);
      await userEvent.click(bar.getByRole("button", { name: "Call ended" }), { pointerEventsCheck: 0 });
      await expect(args.onReturn).not.toHaveBeenCalled();
      await expect(bar.queryByRole("button", { name: "End call" })).toBeNull();
    },
  },
};
