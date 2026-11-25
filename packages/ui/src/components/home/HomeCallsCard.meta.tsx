import type { ComponentMeta } from "vibestack/stories";
import type { HomeCallsCardProps } from "./HomeCallsCard.tsx";

export const meta: ComponentMeta<HomeCallsCardProps> = {
  args: { app: "Messages", lines: [{ title: "Ana Lima", detail: "On my way" }, { title: "Bruno Costa", detail: "Photo" }] },
  examples: { Phone: { app: "Phone", lines: [{ title: "Carla Dias", detail: "Missed call, 9:41 AM" }] } },
};
