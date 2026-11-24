import { expect, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { ManeuverIconProps } from "./ManeuverIcon.tsx";

export const meta: ComponentMeta<ManeuverIconProps> = {
  args: { maneuver: "left", className: "size-10" },
  examples: { Continue: { maneuver: undefined }, Roundabout: { maneuver: "roundabout" }, Arrive: { maneuver: "arrive" } },
  play: {
    Default: async ({ canvasElement }) => {
      await expect(within(canvasElement).getByRole("img", { name: "Turn left" })).toBeInTheDocument();
    },
    Continue: async ({ canvasElement }) => {
      await expect(within(canvasElement).getByRole("img", { name: "Continue" })).toBeInTheDocument();
    },
  },
};
