import type { ComponentMeta } from "vibestack/stories";
import type { AssistantReceiptCardProps } from "./AssistantReceiptCard.tsx";

export const meta: ComponentMeta<AssistantReceiptCardProps> = {
  args: { title: "Do not disturb is on", lines: ["Until 07:00", "Calls from favourites still ring"] },
  examples: { "No lines": { lines: [] } },
};
