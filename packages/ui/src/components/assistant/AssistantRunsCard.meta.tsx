import type { ComponentMeta } from "vibestack/stories";
import type { AssistantRunsCardProps } from "./AssistantRunsCard.tsx";

export const meta: ComponentMeta<AssistantRunsCardProps> = {
  args: {
    title: "Workflow runs",
    runs: [
      { id: "1", title: "Friday digest", status: "ok", label: "Done", when: "17:00" },
      { id: "2", title: "Archive receipts", status: "error", label: "Failed", when: "09:00" },
      { id: "3", title: "Morning brief", status: "busy", label: "Running" },
    ],
  },
};
