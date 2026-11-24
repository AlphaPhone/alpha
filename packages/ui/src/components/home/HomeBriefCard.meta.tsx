import { expect, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { HomeBriefCardProps } from "./HomeBriefCard.tsx";

export const meta: ComponentMeta<HomeBriefCardProps> = {
  args: {
    outcome: "Finished",
    summary: "Two meetings today; the design review moved to 3 PM. Rain after 5, so the run is better at lunch.",
    when: "7:00 AM",
  },
  examples: { "Run failed": { outcome: "RunFailed", summary: undefined } },
  play: {
    "Run failed": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("button")).toHaveAccessibleName(/Didn't run/),
  },
};
