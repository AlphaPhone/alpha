import type { ComponentMeta } from "vibestack/stories";
import type { AssistantAgendaCardProps } from "./AssistantAgendaCard.tsx";

export const meta: ComponentMeta<AssistantAgendaCardProps> = {
  args: {
    title: "Today",
    rows: [
      { id: "1", time: "09:30", title: "Stand-up" },
      { id: "2", time: "12:30", title: "Lunch with Ana" },
      { id: "3", time: "16:00", title: "Dentist, Rua Augusta" },
    ],
  },
};
