import type { ComponentMeta } from "vibestack/stories";
import type { HomeCallsCardProps } from "./HomeCallsCard.tsx";

export const meta: ComponentMeta<HomeCallsCardProps> = {
  args: { app: "Messages", summary: "2", lines: [{ title: "Ana Lima", detail: "On my way" }, { title: "Bruno Costa", detail: "Photo" }], status: "9:21 PM" },
  examples: { Phone: { app: "Phone", summary: "1", lines: [{ title: "Carla Dias", detail: "Missed" }], status: "9:41 AM" } },
};
