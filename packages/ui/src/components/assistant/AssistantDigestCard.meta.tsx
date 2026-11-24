import type { ComponentMeta } from "vibestack/stories";
import type { AssistantDigestCardProps } from "./AssistantDigestCard.tsx";

export const meta: ComponentMeta<AssistantDigestCardProps> = {
  args: {
    title: "3 new messages",
    rows: [
      { id: "1", who: "Ana Lima", text: "Lunch on Friday?" },
      { id: "2", who: "Bruno Costa", text: "The invoice is attached" },
      { id: "3", who: "Carla Dias", text: "Running ten minutes late" },
    ],
  },
};
