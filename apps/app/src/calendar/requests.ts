// spec/app/calendar/agent.md, "The agent proposes one change at a time, for the revision of the event it selected, and the card shows it"; spec/app/calendar/agent.md, "A card is complete only with known fields, a valid time and, for a change, a verified target"
import type { Change, Reply } from "../../gen/app__calendar__agent.ts";
import { cardComplete, targetVerified } from "../../gen/app__calendar__agent.ts";
import type { Row } from "./shown.ts";
import { externalStore } from "../runtime/store.ts";

/** The fields a Calendar request of the agent sets, as eliza's `CalendarEventFields` of `@elizaos/plugin-calendar` names them. */
export interface RequestFields {
  readonly title: string;
  readonly description: string;
  readonly location: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly isAllDay: boolean;
  readonly timeZone: string;
  readonly attendees: ReadonlyArray<string>;
}

/** Which occurrences a request reaches: one, this and the following, or every one; none for a one-off event. */
export type Occurrences = "instance" | "this_and_following" | "series" | "";

/** One pending Calendar request of the agent's approvals list, as the card shows it and as its approval names it. */
export interface Request {
  /** The number the machine names it by. */
  readonly filing: number;
  /** The request as the agent's approvals list names it, and the revision of it the owner reviews. */
  readonly id: string;
  readonly revision: string;
  /** How often its revision changed since Calendar first read it. */
  readonly changes: number;
  readonly change: Change;
  readonly reply: Reply;
  readonly fields: RequestFields | undefined;
  readonly occurrences: Occurrences;
  /** The event a change names, the calendar it is on and the version the agent selected; "" for a new event. */
  readonly eventId: string;
  readonly calendarId: string;
  readonly expectedVersion: string;
  readonly notify: boolean;
  /** Whether every key of the request is one Alpha knows how to show. */
  readonly known: boolean;
  readonly expiresAt: string;
}

const kinds: Readonly<Record<string, Change>> = { schedule_event: "Create", modify_event: "Update", cancel_event: "Delete", respond_invitation: "Respond" };
const answers: Readonly<Record<string, Reply>> = { accepted: "Going", tentative: "Maybe", declined: "NotGoing" };
const fieldKeys = new Set(["title", "description", "location", "startAt", "endAt", "isAllDay", "timeZone", "attendees"]);
const changeKeys = new Set(["action", "account", "source", "target", "scope", "fields", "recurrence", "response", "notifyAttendees"]);

function record(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** The fields of a request, and whether each key is one Alpha shows; none where it names no fields. @throws {never} */
function fieldsOf(value: unknown): { fields: RequestFields | undefined; known: boolean } {
  const fields = record(value);
  if (fields === undefined) return { fields: undefined, known: value === undefined };
  const attendees = Array.isArray(fields.attendees) ? fields.attendees.filter((one): one is string => typeof one === "string") : [];
  return {
    fields: {
      title: text(fields.title), description: text(fields.description), location: text(fields.location), startAt: text(fields.startAt),
      endAt: text(fields.endAt), isAllDay: fields.isAllDay === true, timeZone: text(fields.timeZone), attendees,
    },
    known: Object.keys(fields).every((key) => fieldKeys.has(key)) && typeof fields.title === "string" && typeof fields.startAt === "string" && typeof fields.endAt === "string",
  };
}

const numbers = new Map<string, { filing: number; revision: string; changes: number }>();
let next = 0;

/** A Calendar request of the agent's approvals list, read from its untrusted wire row; none for a request of another kind. @throws {never} */
export function requestOf(row: unknown, floor: number): Request | undefined {
  const wire = record(row);
  const payload = record(wire?.payload);
  const change = record(payload?.change);
  if (wire === undefined || change === undefined) return undefined;
  const kind = kinds[text(change.action)];
  const id = text(wire.id);
  if (kind === undefined || id === "" || text(wire.state) !== "pending") return undefined;
  const revision = text(wire.revision);
  const before = numbers.get(id);
  next = Math.max(next, floor);
  const counted = before === undefined ? { filing: ++next, revision, changes: 0 } : before.revision === revision ? before : { ...before, revision, changes: before.changes + 1 };
  numbers.set(id, counted);
  const target = record(change.target);
  const source = record(target?.source ?? change.source);
  const { fields, known } = fieldsOf(change.fields);
  const scope = text(change.scope);
  return {
    filing: counted.filing, id, revision, changes: counted.changes, change: kind,
    reply: kind === "Respond" ? (answers[text(change.response)] ?? "NoReply") : "NoReply",
    fields, occurrences: scope === "instance" || scope === "this_and_following" || scope === "series" ? scope : "",
    eventId: text(target?.eventId), calendarId: text(source?.calendarId), expectedVersion: text(target?.expectedVersion),
    notify: change.notifyAttendees === true, known: known && Object.keys(change).every((key) => changeKeys.has(key)),
    expiresAt: text(wire.expiresAt),
  };
}

/** Whether a request's times make a span: an end after its start, where it sets them. @throws {never} */
export function timeValid(request: Request): boolean {
  if (request.fields === undefined) return true;
  const start = Date.parse(request.fields.startAt);
  const end = Date.parse(request.fields.endAt);
  return Number.isFinite(start) && Number.isFinite(end) && end > start;
}

/** Whether the card may be approved: known fields, a valid time and, for a change, exactly one event of one calendar at the version asked. @throws {never} */
export function complete(request: Request, rows: ReadonlyArray<Row>): boolean {
  const matches = rows.filter((row) => row.key === request.eventId);
  const calendars = new Set(matches.map((row) => row.calendarId));
  const same = matches.length === 1 && matches[0] !== undefined && (request.calendarId === "" || matches[0].calendarId === request.calendarId);
  const verified = targetVerified(calendars.size, matches.length, same, same && matches[0]?.version === request.expectedVersion);
  return cardComplete(request.change, request.known, verified, timeValid(request));
}

const held = new Map<number, Request>();
const version = externalStore(0);

/** The requests the card was given, by the number the machine names each by, as a store the screen reads. */
export const requests = {
  snapshot: version.snapshot,
  subscribe: version.subscribe,
  /** @throws {never} */
  keep(request: Request): void {
    held.set(request.filing, request);
    version.set(version.snapshot() + 1);
  },
  /** @throws {never} */
  find: (filing: number): Request | undefined => held.get(filing),
};
