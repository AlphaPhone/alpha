import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { CallBarViewProps } from "./CallBarView.tsx";
import { activeCall, endedCall, ringingCall } from "./fixtures.ts";

export const meta: ComponentMeta<CallBarViewProps> = {
  args: { bar: activeCall, onReturn: fn(), onEnd: fn() },
  examples: { Ringing: { bar: ringingCall }, Ended: { bar: endedCall } },
  play: {
    Ended: async ({ canvasElement, args }) => {
      const bar = within(canvasElement);
      await userEvent.click(bar.getByRole("button", { name: "Call ended" }), { pointerEventsCheck: 0 });
      await expect(args.onReturn).not.toHaveBeenCalled();
      await expect(bar.queryByRole("button", { name: "End call" })).toBeNull();
    },
  },
};
