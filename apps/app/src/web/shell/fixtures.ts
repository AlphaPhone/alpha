// States the shell's components show, for their stories (`*.meta.tsx`).
import { CalendarDays, Folder, Inbox, NotebookText, Settings } from "lucide-react";
import type { Overview } from "../../../gen/shell__overview.ts";
import { initial as overviewStart } from "../../../gen/shell__overview.ts";
import type { Permissions } from "../../../gen/shell__permissions.ts";
import { initial as permissionsStart } from "../../../gen/shell__permissions.ts";
import type { Toasts } from "../../../gen/shell__toasts.ts";
import { initial as toastsStart } from "../../../gen/shell__toasts.ts";
import type { TileFace } from "./AppTile.tsx";
import type { GestureControls } from "./TileGrid.tsx";

const now = Date.UTC(2026, 10, 22, 15, 0);

/** Home's default tiles. */
export const homeTiles: TileFace[] = [
  { key: "alpha:inbox", label: "Inbox", icon: Inbox, badge: true },
  { key: "alpha:calendar", label: "Calendar", icon: CalendarDays },
  { key: "alpha:notes", label: "Notes", icon: NotebookText },
  { key: "alpha:files", label: "Files", icon: Folder },
  { key: "alpha:settings", label: "Settings", icon: Settings },
];

/** One Alpha app's tile. */
export const notesTile: TileFace = { key: "alpha:notes", label: "Notes", icon: NotebookText };

/** Two installed apps with the same name, told apart by their profile. */
export const libraryEntries: TileFace[] = [
  { key: "org.fixture.clock", label: "Clock" },
  { key: "org.fixture.clock/org.fixture.clock.Main#10", label: "Clock", detail: "Work" },
  { key: "org.fixture.camera", label: "Camera" },
];

/** A day with the next event, unread mail, a brief and workflows that are on. */
export const busyDay: Overview = {
  ...overviewStart, mounted: true, today: 20414, now, rowsShown: true, readDay: 20414, readAt: now - 600_000, feed: "FeedComplete",
  items: [{ id: "standup", title: "Standup", begin: now + 3_600_000, end: now + 5_400_000, allDay: false, overdue: false, video: true }],
  attention: "AttentionReady", unread: 3, more: true, attentionAt: now - 300_000, connected: true,
  brief: "BriefRan", briefAt: now - 7_200_000, briefTitle: "Two meetings moved and a parcel arrives after six.",
  workflows: 2, workflowsAt: now - 900_000,
};

/** An overdue reminder holding the agenda card, with the next event beside it. */
export const overdueDay: Overview = {
  ...busyDay,
  overdue: [{ id: "rent", title: "Pay rent", begin: now - 86_400_000, end: now - 86_400_000, allDay: false, overdue: true, video: false }],
};

/** Nothing to show: the date and the Gmail setup link. */
export const quietDay: Overview = { ...overviewStart, mounted: true, now };

/** A toast with Undo showing. */
export const undoToast: Toasts = {
  ...toastsStart, shown: { message: "Deleted Lunch", chars: 13, undo: "undo-1", failure: false }, seq: 1, duration: 10000, readMin: 10000, delay: 10000,
};

/** The walkthrough at the camera step, after notifications and the microphone were allowed. */
export const cameraStep: Permissions = {
  ...permissionsStart, restored: true, imageKnown: true, signedIn: true, foreground: true, phase: "PhaseWalkthrough", progress: 2,
  states: { ...permissionsStart.states, $PermNotifications: "AccessReady", $PermMicrophone: "AccessReady", $PermCamera: "AccessAsk", $PermLocation: "AccessAsk" } as Permissions["states"],
};

/** The camera step with its request unanswered for twenty seconds, so Skip is offered. */
export const stalledStep: Permissions = { ...cameraStep, pending: 2, ticket: 1, generation: 1, stalled: true };

/** A review from Settings of a native step Android already allowed: Android's settings page is offered. */
export const reviewedStep: Permissions = {
  ...cameraStep, native: true, keys: ["PermNotifications", "PermMicrophone", "PermCamera", "PermLocation", "PermCalendar", "PermPhotos", "PermFiles"],
  target: 0, reopened: true, review: true, completed: true, progress: -1,
};

/** Gesture handlers that do nothing, for stories. */
export const idleControls: GestureControls = {
  down: () => {}, move: () => {}, up: () => {}, cancel: () => {}, context: () => {}, tap: () => {}, arrow: () => {}, erase: () => {},
};
