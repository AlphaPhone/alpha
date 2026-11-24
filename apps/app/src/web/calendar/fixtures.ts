// spec/calendar/presentation.md, "Story: Move between days, weeks, months and my schedule"
// Fixture rows for the stories (`*.meta.tsx`); never loaded by the app.
import { initial as agentInitial } from "../../../gen/calendar__agent.ts";
import { initial as reviewInitial } from "../../../gen/calendar__approvals.ts";
import { initial as heldInitial, type DeferredDeletes } from "../../../gen/calendar__deletions.ts";
import { initial as draftInitial, type EditorDraft } from "../../../gen/calendar__drafts.ts";
import { initial as linkInitial } from "../../../gen/calendar__googleLink.ts";
import { initial as presentationInitial, type Presentation } from "../../../gen/calendar__presentation.ts";
import type { AgentView } from "../../calendar/agent.vibe";
import type { ApprovalSheet } from "../../calendar/approvals.vibe";
import type { DeviceRead } from "../../calendar/device.vibe";
import type { HomeAgendaCard } from "../../calendar/home.vibe";
import type { CalendarLinkView } from "../../calendar/link.vibe";
import type { RequestSheet } from "../../calendar/requests.vibe";
import type { DraftFieldsRecord } from "../../calendar/drafts.schema.vibe";
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

/** Today's day view for the signed-in owner, after a published read. */
export const presentation: Presentation = { ...presentationInitial, owner: "owner", agentRows: true, agentRowsOwner: "owner", deviceRows: true, readToken: 1, lastReadToken: 1 };

/** Calendar before any read, with no owner signed in. */
export const unreadPresentation: Presentation = presentationInitial;

/** The agent Calendar read for the owner and complete. */
export const agentReady: AgentView = {
  state: { ...agentInitial, portOwner: "owner", portUsable: true, owner: "owner", status: "Ready", feed: "FeedComplete" },
  feed: undefined, calendars: [], upcoming: undefined, savedAt: undefined, window: undefined,
};

/** The agent Calendar's first read in flight. */
export const agentLoading: AgentView = { ...agentReady, state: { ...agentReady.state, status: "Loading", read: { ...agentInitial.read, id: 1, owner: "owner", phase: "Reading" } } };

/** No agent session: Calendar says Not connected. */
export const agentDisconnected: AgentView = { ...agentReady, state: agentInitial };

/** The agent Calendar's read failed. */
export const agentFailed: AgentView = { ...agentReady, state: { ...agentReady.state, status: "Failed", feed: "FeedFailed", error: "LoadError" } };

/** A saved copy shown after the latest refresh failed. */
export const agentStale: AgentView = { ...agentFailed, savedAt: now - 3_600_000 };

/** The device calendars read: one writable calendar. */
export const deviceAllowed: DeviceRead = {
  status: "allowed", range: undefined, events: [], truncated: false, readAt: now,
  calendars: [{ id: "3", name: "Personal", account: "Device calendar", writable: true, local: true }],
};

/** Android has not been asked for the device calendars yet. */
export const deviceConnect: DeviceRead = { ...deviceAllowed, status: "connect", calendars: [], readAt: undefined };

/** A device read cut at its 2,000 event limit. */
export const deviceLimited: DeviceRead = { ...deviceAllowed, status: "limited", truncated: true };

/** The device calendars could not be read. */
export const deviceFailed: DeviceRead = { ...deviceAllowed, status: "failed", calendars: [] };

/** The Google Calendar row with no Google account linked. */
export const linkView: CalendarLinkView = { row: "RowNotConnected", link: linkInitial, destination: "", held: 0, running: false, pause: undefined };

/** A deleted event held for Undo. */
export const heldDeletion: DeferredDeletes = { ...heldInitial, lastId: 1, held: [{ id: 1, target: "evt-standup", phase: "Waiting", decline: false }] };

/** A declined invitation held for Undo. */
export const heldDecline: DeferredDeletes = { ...heldInitial, lastId: 2, held: [{ id: 2, target: "evt-review", phase: "Waiting", decline: true }] };

/** A held deletion already on its way: no Undo is offered. */
export const heldSending: DeferredDeletes = { ...heldInitial, lastId: 1, held: [{ id: 1, target: "evt-standup", phase: "Sending", decline: false }] };

const approvalFields = [
  { label: "Action", value: "Move event" }, { label: "Title", value: "Standup" }, { label: "Starts", value: "Fri, Nov 20, 10:30" },
  { label: "Ends", value: "Fri, Nov 20, 11:00" }, { label: "Where", value: "Room 2" },
];

/** A change the agent asked for, read and waiting for the owner. */
export const approvalPending: ApprovalSheet = {
  state: { ...reviewInitial, phase: "ReviewShown", epoch: 1, readEpoch: 1, requestId: "3f2a9c1e-7b4d-4e8a-9c2f-1a2b3c4d5e6f", found: true, verified: true, complete: true, shownRevision: "etag-1" },
  row: undefined, presentation: { heading: "Move Standup", fields: approvalFields, complete: true }, answer: undefined,
};

/** The review read again at the tap. */
export const approvalChecking: ApprovalSheet = { ...approvalPending, state: { ...approvalPending.state, phase: "Rechecking" } };

/** The event's current details could not be verified: Approve stays off. */
export const approvalIncomplete: ApprovalSheet = { ...approvalPending, presentation: { heading: "Move Standup", fields: approvalFields, complete: false } };

/** A change that did not go through and may be approved again. */
export const approvalRetryable: ApprovalSheet = { ...approvalPending, state: { ...approvalPending.state, approval: "ApprovalRetryable" } };

/** A request that expired before the owner answered. */
export const approvalExpired: ApprovalSheet = { ...approvalPending, state: { ...approvalPending.state, approval: "ApprovalExpired" } };

/** A request the review could not find. */
export const approvalMissing: ApprovalSheet = { ...approvalPending, state: { ...approvalPending.state, found: false, verified: false }, presentation: undefined };

/** The agent's answer after the owner approved. */
export const approvalAnswered: ApprovalSheet = {
  ...approvalPending, state: { ...approvalPending.state, phase: "ReviewResolved", decision: "ApproveChange", approval: "ApprovalDone", resolution: "ResolvedSucceeded" },
  answer: { requestId: "3f2a9c1e-7b4d-4e8a-9c2f-1a2b3c4d5e6f", decision: "approve", kind: "succeeded", text: "Standup moved to 10:30." },
};

/** A new event with a long description. */
export const approvalLong: ApprovalSheet = {
  ...approvalPending,
  presentation: { heading: "Schedule Quarterly planning offsite with the whole product and design team", complete: true, fields: [...approvalFields,
    { label: "Notes", value: "Agenda:\n1. Review last quarter's goals and what shipped\n2. Customer interviews: what we heard\n3. Roadmap for the next two quarters\n4. Hiring plan\n5. Team dinner at 19:00, booked for twelve people" }] },
};

const availabilitySources = [
  { id: "1", name: "Personal", account: "owner@example.com", sourceRevision: "a".repeat(64) },
  { id: "2", name: "Work", account: "owner@example.com", sourceRevision: "b".repeat(64) },
];
const availabilityWindow = { start: "2026-11-20T15:00:00.000Z", end: "2026-11-20T17:00:00.000Z", timeZone: "UTC" };

/** The agent asks whether the owner is free this afternoon: choose the calendars to read. */
export const chooseCalendars: RequestSheet = { kind: "choose-calendars", sources: availabilitySources, operation: { type: "calendar_availability", ...availabilityWindow } };

/** Many calendars on the phone to choose from. */
export const chooseManyCalendars: RequestSheet = {
  ...chooseCalendars,
  sources: ["Personal", "Work", "Family", "Birthdays", "Holidays in United Kingdom", "Gym classes", "Book club", "Kids' school"].map((name, i) => ({ id: String(i + 1), name, account: i < 2 ? "owner@example.com" : "Device calendar", sourceRevision: String(i).repeat(64) })),
};

/** The answer to share: busy twice, once tentatively. */
export const busyAnswer: RequestSheet = {
  kind: "confirm-result", chosen: availabilitySources,
  result: { version: 1, kind: "calendar_availability", window: availabilityWindow, calendarCount: 2, status: "busy", transparentIgnored: 0, busy: [
    { start: "2026-11-20T15:30:00.000Z", end: "2026-11-20T16:00:00.000Z", allDay: false, tentative: false },
    { start: "2026-11-20T16:15:00.000Z", end: "2026-11-20T16:45:00.000Z", allDay: false, tentative: true },
  ] },
};

/** The answer to share: free the whole window. */
export const freeAnswer: RequestSheet = { kind: "confirm-result", chosen: [availabilitySources[0]!], result: { version: 1, kind: "calendar_availability", window: availabilityWindow, calendarCount: 1, status: "free", transparentIgnored: 1, busy: [] } };

const homeCard: HomeAgendaCard = { state: "HomeEvent", title: "Standup", begin: standup.begin, end: standup.end, allDay: false, video: true, route: "event/agent%3Astandup?day=0", day: 0, rereads: false };

/** Home's card on the next event, a video meeting. */
export const homeNext: HomeAgendaCard = homeCard;

/** Home's card on the event just saved. */
export const homeSaved: HomeAgendaCard = { ...homeCard, state: "HomeSavedEvent", title: "Lunch with Ada", video: false };

/** Home's card on an all-day event with a long title. */
export const homeAllDayLong: HomeAgendaCard = { ...homeCard, title: "Trip to the coast with the whole family and the dog", begin: trip.begin, end: trip.end, allDay: true, video: false };

/** Calendar verified nothing is planned. */
export const homeNothing: HomeAgendaCard = { ...homeCard, state: "HomeNothingPlanned", title: "", begin: undefined, end: undefined, video: false, route: undefined };

/** Calendar could not verify what is next. */
export const homeUnverified: HomeAgendaCard = { ...homeNothing, state: "HomeUnverified" };

/** The read failed; tapping reads again. */
export const homeFailed: HomeAgendaCard = { ...homeNothing, state: "HomeFailed", rereads: true };

/** No agent Calendar to read yet. */
export const homeQuiet: HomeAgendaCard = { ...homeNothing, state: "HomeQuiet", title: "Calendar" };
