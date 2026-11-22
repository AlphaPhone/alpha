// spec/calendar/index.md
import { CalendarDays } from "lucide-react";
import type { AppScreen, AppSurface } from "../app-screen.ts";
import { CalendarScreen } from "./CalendarScreen.tsx";
import { AgentRequestReview, ApprovalReview, UndoNotices } from "./Surfaces.tsx";

export { HomeAgendaCard, type HomeAgendaCardProps } from "./HomeAgendaCard.tsx";
export { SyncSettings, type SyncSettingsProps } from "./SyncSettings.tsx";

/** The Calendar app, on every build. */
export const screens: AppScreen[] = [
  { id: "calendar", title: "Calendar", icon: CalendarDays, availability: "everywhere", Screen: CalendarScreen },
];

/** Calendar's always-mounted surfaces: the Undo notice of a held deletion, the approval review and the availability review. */
export const surfaces: AppSurface[] = [
  { id: "calendar-undo", slot: "notices", availability: "everywhere", Surface: UndoNotices },
  { id: "calendar-approval", slot: "overlay", availability: "everywhere", Surface: ApprovalReview },
  { id: "calendar-requests", slot: "overlay", availability: "everywhere", Surface: AgentRequestReview },
];
