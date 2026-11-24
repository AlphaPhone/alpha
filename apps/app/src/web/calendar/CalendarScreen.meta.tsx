import type { ComponentMeta } from "vibestack/stories";
import type { CalendarScreenProps } from "./CalendarScreen.tsx";

const none = () => undefined;

export const meta: ComponentMeta<CalendarScreenProps> = {
  args: { onClose: none },
  examples: {
    Calendars: { route: "settings" },
    HandedOverDraft: { route: "draft" },
    OpenedOnEvent: { route: "event/agent%3Astandup?day=0" },
  },
};
