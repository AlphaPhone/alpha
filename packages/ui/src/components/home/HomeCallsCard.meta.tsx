import type { ComponentMeta } from "vibestack/stories";
import type { HomeCallsCardProps } from "./HomeCallsCard.tsx";

export const meta: ComponentMeta<HomeCallsCardProps> = {
  args: { app: "Messages", count: "7", status: "Fri", lines: [{ title: "(419) 837-8828", detail: "Congratulations Marion, check how much you saved" }, { title: "(252) 832-0102", detail: "Your check is available" }] },
  examples: {
    Phone: { app: "Phone", count: "6", status: "6:30 PM", lines: [{ title: "Carson", detail: "Missed · 2" }, { title: "(920) 555-0148", detail: "Missed" }] },
    "Count not known": { count: undefined, status: undefined },
  },
};
