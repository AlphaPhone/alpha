// spec/calendar/presentation.md, "Story: Move between days, weeks, months and my schedule"
// Fixture rows for the stories (`*.meta.tsx`); never loaded by the app.
import { initial as draftInitial, type EditorDraft } from "../../../gen/calendar__drafts.ts";
import type { DraftFieldsRecord } from "../../calendar/drafts.schema.vibe";
import type { SyncDestination } from "../../calendar/sync.vibe";
import type { CalendarRow } from "../../calendar/model.vibe";
import type { EventFacts } from "./EventDetail.tsx";
import type { ListGroup } from "./layout.ts";

/** A fixed "now": 2026-11-20 09:30 UTC. */
export const now = Date.UTC(2026, 10, 20, 9, 30);

const base = { source: "agent", sourceKey: "agent", notes: "", where: "", allDay: false, revision: "etag-1", calendarName: "Agent Calendar", account: "owner@example.com", writable: true, recurring: false, timeZone: "UTC" } as const;

/** A morning meeting today. */
export const standup: CalendarRow = { ...base, id: "agent:standup", title: "Standup", where: "Room 2", begin: Date.UTC(2026, 10, 20, 10), end: Date.UTC(2026, 10, 20, 10, 30), offset: 0, endOffset: 1 };

/** A repeating evening run, read only. */
export const run: CalendarRow = { ...base, id: "device:7:1", source: "device", sourceKey: "native:3", title: "Run", begin: Date.UTC(2026, 10, 20, 18), end: Date.UTC(2026, 10, 20, 19), offset: 0, endOffset: 1, writable: false, recurring: true, calendarName: "Personal", account: "Device calendar" };

/** A two-day all-day trip from tomorrow. */
export const trip: CalendarRow = { ...base, id: "agent:trip", title: "Trip", allDay: true, begin: Date.UTC(2026, 10, 21), end: Date.UTC(2026, 10, 23), offset: 1, endOffset: 3 };

/** Every fixture row. */
export const rows: readonly CalendarRow[] = [standup, run, trip];

/** The schedule from today. */
export const groups: readonly ListGroup[] = [
  { key: "0", label: "Today · Friday, November 20", items: [{ row: standup, time: "10:00 – 10:30" }, { row: run, time: "18:00 – 19:00" }] },
  { key: "1", label: "Tomorrow · Saturday, November 21", items: [{ row: trip, time: "All day · until Nov 22" }] },
];

/** An organizer's event with a meeting link. */
export const organizerFacts: EventFacts = { mode: "OrganizerCancel", managed: false, join: "https://meet.example.com/abc", provider: undefined, repeat: "", invitePending: false,
  people: [{ key: "0:owner@example.com", name: "Sam Rivera", reply: "WordOrganizer" }, { key: "1:ada@example.com", name: "Ada Park", reply: "WordGoing" }, { key: "2:lee@example.com", name: "lee@example.com", reply: "WordAwaiting" }] };

/** An unanswered invitation in a managed Google calendar. */
export const inviteFacts: EventFacts = { mode: "DeclineInvitation", managed: true, join: undefined, provider: "https://calendar.google.com/event", repeat: "Repeats weekly on Fri", invitePending: true,
  people: [{ key: "0:host@example.com", name: "Host", reply: "WordOrganizer" }, { key: "1:owner@example.com", name: "You", reply: "WordAwaiting" }] };

/** A new event's fields, today at ten for an hour. */
export const newEventFields: DraftFieldsRecord = { title: "Lunch with Ada", body: "", location: "Cafe", start: "2026-11-20T10:00", end: "2026-11-20T11:00", zone: "UTC",
  allDay: false, repeat: "none", alert: null, video: false, who: [], calendar: "local", creationId: "fixture-1", origin: "typed" };

/** An editor open on a new event, nothing retained yet. */
export const openDraft: EditorDraft = { ...draftInitial, owner: "owner", alive: true, opened: true };

/** An editor offering edits retained from before Calendar was interrupted. */
export const offeredDraft: EditorDraft = { ...openDraft, offered: true, form: "BaselineFields", text: JSON.stringify(newEventFields) };

/** An editor whose slot another window changed. */
export const conflictDraft: EditorDraft = { ...openDraft, conflict: true };

/** An editor whose slot cannot be read, in a development build's recovery. */
export const recoveryDraft: EditorDraft = { ...openDraft, storageError: true, recovery: "RecoveryReady", recoveryCurrent: true };

/** The owner's writable Google calendars. */
export const destinations: readonly SyncDestination[] = [
  { connectorAccountId: "google-1", providerCalendarId: "primary", name: "Primary", account: "owner@example.com", version: 1 },
  { connectorAccountId: "google-1", providerCalendarId: "team", name: "Team", account: "owner@example.com", version: 1 },
];

/** Two writable Google calendars device sync may choose. */
export const deviceSyncOffered = [
  { connectionId: "0f6c2a8e-3b1d-4c5e-9a7f-1e2d3c4b5a69", providerCalendarId: "primary", name: "owner@example.com", account: "owner@example.com" },
  { connectionId: "0f6c2a8e-3b1d-4c5e-9a7f-1e2d3c4b5a69", providerCalendarId: "team@group.calendar.google.com", name: "Team", account: "owner@example.com" },
] as const;

/** Device sync off, with a calendar chosen and nothing reviewed yet. */
export const deviceSyncOff = {
  available: true, ready: true, status: "Sync is off.", running: false, enabled: false, selection: deviceSyncOffered[0],
  destination: { account: "", calendar: "" }, reviewed: undefined, offered: undefined,
};
