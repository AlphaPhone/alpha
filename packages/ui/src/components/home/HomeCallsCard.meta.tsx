import type { ComponentMeta } from "vibestack/stories";
import type { HomeCallsCardProps } from "./HomeCallsCard.tsx";

export const meta: ComponentMeta<HomeCallsCardProps> = {
  args: { app: "Messages", summary: "2", lines: [{ title: "Ana Lima", detail: "On my way" }, { title: "Bruno Costa", detail: "Photo" }], status: "Fri" },
  examples: { Phone: { app: "Phone", summary: "2", lines: [{ title: "Carla Dias", detail: "Missed" }, { title: "(920) 555-0134", detail: "Missed · 2" }], status: "6:30 PM" } },
};
