import type { ComponentMeta } from "vibestack/stories";
import type { HomeWorkflowsCardProps } from "./HomeWorkflowsCard.tsx";

export const meta: ComponentMeta<HomeWorkflowsCardProps> = {
  args: {
    lines: [{ title: "Morning brief", detail: "Ran at 7:00 AM" }, { title: "Receipts to Files", detail: "Waiting for mail" }],
    more: 3,
    freshness: "UpToDate",
  },
  examples: { One: { lines: [{ title: "Morning brief", detail: "Ran at 7:00 AM" }], more: 0 } },
};
