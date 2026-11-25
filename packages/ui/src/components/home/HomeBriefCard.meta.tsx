import type { ComponentMeta } from "vibestack/stories";
import type { HomeBriefCardProps } from "./HomeBriefCard.tsx";

export const meta: ComponentMeta<HomeBriefCardProps> = {
  args: {
    outcome: "Finished",
    summary: "Two meetings today; the design review moved to 3 PM. Rain after 5, so the run is better at lunch.",
    status: "Your agent · Ran 7:00 AM",
  },
  examples: { "Run failed": { outcome: "RunFailed", status: "Your agent · Failed 7:00 AM" } },
};
