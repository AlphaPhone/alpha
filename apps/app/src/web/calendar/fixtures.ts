// spec/calendar/presentation.md, "Story: Move between days, weeks, months and my schedule"
// Fixture rows for the stories (`*.meta.tsx`); never loaded by the app.
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
export const organizerFacts: EventFacts = { mode: "OrganizerCancel", managed: false, join: "https://meet.example.com/abc", provider: undefined, repeat: "", invitePending: false };

/** An unanswered invitation in a managed Google calendar. */
export const inviteFacts: EventFacts = { mode: "DeclineInvitation", managed: true, join: undefined, provider: "https://calendar.google.com/event", repeat: "Repeats weekly on Fri", invitePending: true };
