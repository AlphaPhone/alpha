// spec/calendar/index.md; spec/calendar/presentation.md, "Back closes one layer at a time: the form, the delete sheet, the event, the Calendars sheet, the date picker, then search"; spec/calendar/approvals.md, "A changed conversation, a hidden page or Back retires the review"
import { Effect } from "effect";
import { CalendarDays } from "lucide-react";
import { ApprovalReviews } from "../../calendar/approvals.vibe";
import { AgentRequests } from "../../calendar/requests.vibe";
import { calendarScreenBack, calendarSurfacesBack } from "../../calendar/screen.vibe";
import type { AppScreen, AppSurface } from "../app-screen.ts";
import { CalendarScreen } from "./CalendarScreen.tsx";
import { ask } from "../shell/services.ts";
import { closes, sheetBack } from "../shell/surfaceBack.ts";
import { AgentRequestReview, ApprovalReview, UndoNotices } from "./Surfaces.tsx";

export { HomeAgendaCard, type HomeAgendaCardProps } from "./HomeAgendaCard.tsx";
export { SyncSettings, type SyncSettingsProps } from "./SyncSettings.tsx";
export { DeviceSyncPanel, DeviceSyncSettings, type DeviceSyncPanelProps } from "./DeviceSyncSettings.tsx";

/** The Calendar app, on every build; Back closes an open review sheet, then its form, delete sheet, event, Calendars sheet, date picker or search, before it leaves Calendar. */
export const screens: AppScreen[] = [
  {
    id: "calendar", title: "Calendar", icon: CalendarDays, availability: "everywhere", Screen: CalendarScreen,
    back: () => ask(calendarScreenBack(), false),
  },
];

/** Back for Calendar's overlay surfaces over any screen: true when it closed the availability or approval review, false when neither is open and Back is the shell's. */
export const surfacesBack = (): Promise<boolean> => ask(calendarSurfacesBack(), false);

/** Calendar's always-mounted surfaces: the Undo notice of a held deletion, the approval review and the availability review. */
export const surfaces: AppSurface[] = [
  { id: "calendar-undo", slot: "notices", availability: "everywhere", Surface: UndoNotices },
  {
    id: "calendar-approval", slot: "overlay", availability: "everywhere", Surface: ApprovalReview,
    back: sheetBack(Effect.map(Effect.service(ApprovalReviews), (reviews) => reviews.changes), (sheet) => sheet.state.phase !== "ReviewIdle",
      (sheet) => sheet.state.phase === "Deciding" ? Effect.succeed(true) : closes(ApprovalReviews.use((reviews) => reviews.close()))),
  },
  {
    id: "calendar-requests", slot: "overlay", availability: "everywhere", Surface: AgentRequestReview,
    back: sheetBack(Effect.map(Effect.service(AgentRequests), (requests) => requests.sheets), (sheet) => sheet.kind !== "none",
      (sheet) => closes(AgentRequests.use((requests) => sheet.kind === "choose-calendars" ? requests.chooseCalendars(null) : requests.confirmResult(false)))),
  },
];
