// spec/calendar/index.md; spec/calendar/presentation.md, "Back closes one layer at a time: the form, the delete sheet, the event, the Calendars sheet, the date picker, then search"
import { CalendarDays } from "lucide-react";
import { calendarBack } from "../../calendar/screen.vibe";
import type { AppScreen, AppSurface } from "../app-screen.ts";
import { CalendarScreen } from "./CalendarScreen.tsx";
import { ask } from "../shell/services.ts";
import { AgentRequestReview, ApprovalReview, UndoNotices } from "./Surfaces.tsx";

export { HomeAgendaCard, type HomeAgendaCardProps } from "./HomeAgendaCard.tsx";
export { SyncSettings, type SyncSettingsProps } from "./SyncSettings.tsx";

/** The Calendar app, on every build; Back closes its form, delete sheet, event, Calendars sheet, date picker or search before it leaves Calendar. */
export const screens: AppScreen[] = [
  {
    id: "calendar", title: "Calendar", icon: CalendarDays, availability: "everywhere", Screen: CalendarScreen,
    back: () => ask(calendarBack(), false),
  },
];

/** Calendar's always-mounted surfaces: the Undo notice of a held deletion, the approval review and the availability review. */
export const surfaces: AppSurface[] = [
  { id: "calendar-undo", slot: "notices", availability: "everywhere", Surface: UndoNotices },
  { id: "calendar-approval", slot: "overlay", availability: "everywhere", Surface: ApprovalReview },
  { id: "calendar-requests", slot: "overlay", availability: "everywhere", Surface: AgentRequestReview },
];
