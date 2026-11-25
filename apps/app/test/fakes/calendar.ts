// spec/app/calendar/index.md, "Story: See my days"; spec/app/calendar/index.md, "Story: See only my own account's calendar"
import type { AndroidCalendarEvent, AndroidCalendarList, AndroidCalendarPlugin, AndroidCalendarRow } from "@elizaos/os-bridges";
import { type Faked, plugin, rejection } from "./phone.ts";
import type { Route } from "./routes.ts";

/** One attendee of an event, as eliza's `@elizaos/plugin-calendar` answers it. */
export interface FakeAttendee {
  email: string | null;
  displayName: string | null;
  responseStatus: string | null;
  self: boolean;
  organizer: boolean;
  optional: boolean;
}

/** One event of the agent's Calendar as eliza's calendar routes answer it (`.eliza/packages/plugin-calendar-client/src/model.vibe`, `CalendarEvent`). */
export interface FakeEvent {
  id: string;
  externalId: string;
  agentId: string;
  provider: "eliza" | "google";
  side: "owner";
  calendarId: string;
  title: string;
  description: string;
  location: string;
  status: string;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  timezone: string | null;
  htmlLink: string | null;
  conferenceLink: string | null;
  organizer: Record<string, unknown> | null;
  attendees: FakeAttendee[];
  metadata: Record<string, unknown>;
  recurringEventId: string | null;
  syncedAt: string;
  updatedAt: string;
}

/** What the fake agent and phone hold for Calendar, and how they behave; a journey changes it between steps. */
export interface CalendarScene {
  /** The agent's Calendar. */
  events: FakeEvent[];
  /** Every write the agent took, as `<method> <id>`, and the idempotency keys it took them under. */
  readonly writes: string[];
  readonly keys: Map<string, FakeEvent>;
  /** A read answers 503, as an agent that is starting does. */
  down: boolean;
  /** A write is taken and never answered, as when the phone dies before the agent replies. */
  stalled: boolean;
  /** A change to a calendar Alpha does not write directly waits for approval. */
  queued: boolean;
  /** The phone's own calendars and their events, and whether Android grants Calendar access, and how often it was asked. */
  readonly calendars: AndroidCalendarRow[];
  phoneEvents: AndroidCalendarEvent[];
  granted: boolean;
  asked: number;
  /** The phone's journal of creations, by creation identity; a create the phone cannot confirm; how often Android Calendar was handed a form. */
  readonly creations: Map<string, string>;
  lost: boolean;
  handedOff: number;
  /** The agent's approvals list: each Calendar request it filed (`.eliza/packages/agent-host/src/approvals/routes.vibe`), and how it was resolved. */
  readonly approvals: FakeApproval[];
  /** The agent's linked sync control: its revision, whether it is paused, the Google calendar it writes to, and the state of each linked event. */
  readonly control: { revision: number; paused: boolean; destination: { connectorAccountId: string; providerCalendarId: string } | null; links: string[] };
}

export function calendarScene(): CalendarScene {
  return {
    events: [], writes: [], keys: new Map(), down: false, stalled: false, queued: false,
    calendars: [{ id: "local", name: "Phone", writable: true, local: true }], phoneEvents: [], granted: false, asked: 0,
    creations: new Map(), lost: false, handedOff: 0,
    control: { revision: 0, paused: true, destination: null, links: [] }, approvals: [],
  };
}

/** One request of the agent's approvals list, as `GET /api/approvals` answers it. */
export interface FakeApproval {
  id: string;
  state: string;
  action: string;
  payload: { change: Record<string, unknown>; digest: string };
  revision: string;
  expiresAt: string;
}

/** A Calendar change the agent filed for the owner's approval, as eliza's calendar plugin files one (`plugin/host.vibe`). */
export function agentRequest(id: string, change: Record<string, unknown>): FakeApproval {
  const action = change["action"] === "respond_invitation" ? (change["response"] === "declined" ? "cancel_event" : "modify_event") : String(change["action"]);
  return { id, state: "pending", action, payload: { change, digest: id }, revision: "r1", expiresAt: "2099-01-01T00:00:00.000Z" };
}

/** Make the change a request holds, as eliza's calendar executor does once the owner approves it. */
function execute(scene: CalendarScene, change: Record<string, unknown>): boolean {
  const fields = (change["fields"] ?? {}) as { title?: string; description?: string; location?: string; startAt?: string; endAt?: string; isAllDay?: boolean };
  const target = (change["target"] ?? {}) as { eventId?: string; expectedVersion?: string };
  if (change["action"] === "schedule_event") {
    const event = agentEvent(fields.title ?? "", Date.parse(fields.startAt ?? ""), Date.parse(fields.endAt ?? ""), { location: fields.location ?? "", isAllDay: fields.isAllDay ?? false });
    scene.writes.push(`create ${event.id}`);
    scene.events.push(event);
    return true;
  }
  const event = scene.events.find((one) => one.id === target.eventId);
  if (!event || etag(event) !== target.expectedVersion) return false;
  if (change["action"] === "cancel_event") {
    scene.writes.push(`delete ${event.id}`);
    scene.events = scene.events.filter((one) => one !== event);
  } else if (change["action"] === "respond_invitation") {
    scene.writes.push(`answer ${event.id} ${String(change["response"])}`);
    event.attendees = event.attendees.map((attendee) => (attendee.self ? { ...attendee, responseStatus: String(change["response"]) } : attendee));
    bump(event);
  } else {
    scene.writes.push(`update ${event.id}`);
    Object.assign(event, { title: fields.title ?? event.title, location: fields.location ?? event.location, startAt: fields.startAt ?? event.startAt, endAt: fields.endAt ?? event.endAt });
    bump(event);
  }
  return true;
}

/** An event of the agent's own calendar from `begin` to `end`, as eliza writes one. */
export function agentEvent(title: string, begin: number, end: number, more: Partial<FakeEvent> = {}): FakeEvent {
  const id = `ev-${title.toLowerCase().replace(/\W+/g, "-")}`;
  const stamp = new Date(begin).toISOString();
  return {
    id, externalId: id, agentId: "agent", provider: "eliza", side: "owner", calendarId: "eliza-calendar/primary", title, description: "", location: "",
    status: "confirmed", startAt: new Date(begin).toISOString(), endAt: new Date(end).toISOString(), isAllDay: false, timezone: null, htmlLink: null,
    conferenceLink: null, organizer: { self: true }, attendees: [], metadata: { etag: "1" }, recurringEventId: null, syncedAt: stamp, updatedAt: stamp, ...more,
  };
}

const etag = (event: FakeEvent) => String(event.metadata["etag"] ?? "");
const bump = (event: FakeEvent) => { event.metadata = { ...event.metadata, etag: String(Number(etag(event)) + 1) }; };
const never = () => new Promise<Response>(() => {});
const base = "/api/lifeops/calendar";

function changed(scene: CalendarScene, key: string, event: FakeEvent, reply: unknown): Response | Promise<Response> {
  scene.keys.set(key, event);
  return scene.stalled ? never() : Response.json(reply);
}

export function calendarRoutes(scene: CalendarScene): Route[] {
  const primary = { connectorAccountId: "google-owner", providerCalendarId: "primary" };
  const controlView = () => ({ revision: scene.control.revision, paused: scene.control.paused, destination: scene.control.destination, pendingDispatch: null, conflicts: 0 });
  return [
    (request, url) => (request.method === "GET" && url.pathname === "/api/approvals"
      ? Response.json({ ownerEntityId: "owner", approvals: scene.approvals.filter((one) => one.state === (url.searchParams.get("state") ?? "pending")).toReversed() })
      : undefined),
    (request, url) => {
      const found = /^\/api\/approvals\/([^/]+)\/resolve$/.exec(url.pathname);
      if (request.method !== "POST" || !found) return;
      const approval = scene.approvals.find((one) => one.id === decodeURIComponent(found[1] ?? ""));
      if (!approval || approval.state !== "pending") return Response.json({ error: "not_found" }, { status: 404 });
      return request.json().then((body: { decision: string; revision: string }) => {
        if (body.revision !== approval.revision) return Response.json({ error: "stale_revision" }, { status: 409 });
        scene.writes.push(`${body.decision} ${approval.id}`);
        if (body.decision === "reject") {
          approval.state = "rejected";
          return Response.json({ requestId: approval.id, decision: "reject", kind: "rejected", text: "Declined." });
        }
        const done = execute(scene, approval.payload.change);
        approval.state = done ? "done" : "rejected";
        return Response.json({ requestId: approval.id, decision: "approve", kind: done ? "succeeded" : "invalidated", text: "" });
      });
    },
    (request, url) => (request.method === "GET" && url.pathname === `${base}/sync-control` ? Response.json(controlView()) : undefined),
    (request, url) => {
      if (request.method !== "GET" || url.pathname !== `${base}/sync-control/destinations`) return;
      const choice = scene.control.destination === null ? "SelectPrimary" : "ResumeDestination";
      return Response.json({ revision: scene.control.revision, choice, destination: scene.control.destination ?? primary, candidates: [{ ...primary, side: "owner", accessRole: "owner", primary: true, accountEmail: "owner@alpha.test" }] });
    },
    (request, url) => {
      if (request.method !== "POST" || url.pathname !== `${base}/sync-control`) return;
      return request.json().then((body: { expectedRevision: number; operation: string; destination?: { connectorAccountId: string; providerCalendarId: string } | null }) => {
        if (body.expectedRevision !== scene.control.revision) return Response.json({ error: "stale_revision" }, { status: 409 });
        if (body.operation === "select") scene.control.destination = body.destination ?? null;
        scene.control.paused = body.operation === "pause";
        scene.control.revision += 1;
        scene.writes.push(`sync ${body.operation}`);
        return Response.json({ ...controlView(), receipt: { id: `r${scene.control.revision}`, operationKey: body.operation, committedAt: "", revision: scene.control.revision, replayed: false } });
      });
    },
    (request, url) => (request.method === "GET" && url.pathname === `${base}/links` ? Response.json({ links: scene.control.links.map((state, at) => ({ linkId: `l${at}`, localEventId: `e${at}`, destination: primary, providerEventId: null, handoffKey: "", localOnly: false, staged: false, state })) }) : undefined),
    (request, url) => {
      if (request.method !== "GET" || url.pathname !== `${base}/feed`) return;
      if (scene.down) return Response.json({ error: "starting" }, { status: 503 });
      const [timeMin, timeMax] = [url.searchParams.get("timeMin") ?? "", url.searchParams.get("timeMax") ?? ""];
      const [from, to] = [Date.parse(timeMin), Date.parse(timeMax)];
      const events = scene.events.filter((event) => Date.parse(event.startAt) < to && Date.parse(event.endAt) > from);
      return Response.json({ calendarId: "all", events, source: "synced", state: "complete", sources: [], timeMin, timeMax, syncedAt: timeMax });
    },
    (request, url) => {
      if (request.method !== "GET" || url.pathname !== `${base}/calendars`) return;
      if (scene.down) return Response.json({ error: "starting" }, { status: 503 });
      return Response.json({ calendars: [{ provider: "eliza", side: "owner", calendarId: "eliza-calendar/primary", summary: "Alpha", primary: true }] });
    },
    (request, url) => {
      if (request.method !== "POST" || url.pathname !== `${base}/events`) return;
      return request.json().then((body: { title: string; description?: string; location?: string; startAt: string; endAt: string; isAllDay?: boolean; idempotencyKey: string }) => {
        const again = scene.keys.get(body.idempotencyKey);
        if (again) return Response.json({ event: again, receipt: {} });
        const event = agentEvent(body.title, Date.parse(body.startAt), Date.parse(body.endAt), { description: body.description ?? "", location: body.location ?? "", isAllDay: body.isAllDay ?? false });
        if (scene.queued) {
          const id = `approval-${scene.approvals.length + 1}`;
          scene.approvals.push(agentRequest(id, { action: "schedule_event", account: "owner", source: { calendarId: "eliza-calendar/primary" }, fields: { title: body.title, description: body.description ?? "", location: body.location ?? "", startAt: body.startAt, endAt: body.endAt, isAllDay: body.isAllDay ?? false, timeZone: "UTC" }, recurrence: null }));
          return Response.json({ approvalRequestId: id }, { status: 202 });
        }
        scene.writes.push(`create ${event.id}`);
        scene.events.push(event);
        return changed(scene, body.idempotencyKey, event, { event, receipt: {} });
      });
    },
    (request, url) => {
      const found = new RegExp(`^${base}/events/([^/]+)(/response)?$`).exec(url.pathname);
      if (!found || (request.method !== "PATCH" && request.method !== "DELETE" && request.method !== "POST")) return;
      const event = scene.events.find((one) => one.id === decodeURIComponent(found[1] ?? ""));
      if (!event) return Response.json({ code: "CALENDAR_EVENT_NOT_FOUND" }, { status: 404 });
      if (request.method === "DELETE") {
        if (url.searchParams.get("expectedProviderVersion") !== etag(event)) return Response.json({ code: "CALENDAR_TARGET_CHANGED" }, { status: 409 });
        scene.writes.push(`delete ${event.id}`);
        if (url.searchParams.get("cancellationMode") === "decline_invitation") {
          event.attendees = event.attendees.map((attendee) => (attendee.self ? { ...attendee, responseStatus: "declined" } : attendee));
          bump(event);
        } else scene.events = scene.events.filter((one) => one !== event);
        return changed(scene, url.searchParams.get("idempotencyKey") ?? "", event, { deleted: true, event, receipt: {} });
      }
      return request.json().then((body: { title?: string; notes?: string; location?: string; startAt?: string; endAt?: string; responseStatus?: string; expectedProviderVersion: string; idempotencyKey: string }) => {
        if (body.expectedProviderVersion !== etag(event)) return Response.json({ code: "CALENDAR_TARGET_CHANGED" }, { status: 409 });
        if (found[2] !== undefined) {
          scene.writes.push(`answer ${event.id} ${body.responseStatus ?? ""}`);
          event.attendees = event.attendees.map((attendee) => (attendee.self ? { ...attendee, responseStatus: body.responseStatus ?? null } : attendee));
        } else {
          scene.writes.push(`update ${event.id}`);
          Object.assign(event, { title: body.title ?? event.title, description: body.notes ?? event.description, location: body.location ?? event.location, startAt: body.startAt ?? event.startAt, endAt: body.endAt ?? event.endAt });
        }
        bump(event);
        return changed(scene, body.idempotencyKey, event, { event, receipt: {} });
      });
    },
  ];
}

/** The calls of `CalendarPlugin.java` eliza's typed client does not name yet: a create under a creation identity, and its receipts. */
interface Creations {
  save(input: { id?: string; title: string; body?: string; location?: string; begin: number; end: number; calendarId: string; creationId?: string; separateCreation?: boolean; expected?: { revision: string } }): Promise<{ status: string; id?: string; calendarId?: string; creationId?: string }>;
  pendingCreations(): Promise<{ status: string; creations: { creationId: string; status: string }[] }>;
}

/** The phone event `id` as the plugin compares it: its revision is what it says. */
const revisionOf = (event: AndroidCalendarEvent) => JSON.stringify([event.title, event.body, event.location, event.begin, event.end]);

/**
 * `CalendarPlugin.java`, the `ElizaCalendar` plugin: Android's one prompt for Calendar access, the phone's calendars
 * and events of a range, which it lists only once access is granted, a create journaled under its creation identity
 * (`lost` makes the next one's answer unknown, as a write the phone could not confirm), a change of the event as last inspected, and
 * a deletion the phone's own review confirmed.
 */
export function elizaCalendar(scene: CalendarScene): Faked {
  const find = (id: string) => scene.phoneEvents.find((event) => event.id === id);
  return plugin<Omit<AndroidCalendarPlugin, "save"> & Creations>(() => ({
    checkPermissions: () => Promise.resolve({ calendar: scene.granted ? "granted" : "prompt" }),
    requestAccess() {
      scene.asked += 1;
      scene.granted = true;
      return Promise.resolve({ status: "granted" });
    },
    list({ begin, end }): Promise<AndroidCalendarList> {
      if (!scene.granted) return Promise.resolve({ status: "permission-required" });
      return Promise.resolve({ status: "ready", calendars: scene.calendars, events: scene.phoneEvents.filter((event) => event.begin < end && event.end > begin), truncated: false });
    },
    open: () => Promise.resolve({ status: "opened" }),
    insertHandoff() {
      scene.handedOff += 1;
      return Promise.resolve({ status: "opened", alertsPrefilled: false });
    },
    inspect({ id }) {
      const event = find(id);
      return Promise.resolve(event ? { status: "ready", revision: revisionOf(event), sourceRevision: revisionOf(event) } : { status: "conflict" });
    },
    save(input) {
      if (input.id === undefined || input.id === "") {
        const id = `p${scene.phoneEvents.length + 1}`;
        scene.phoneEvents.push({ id, calendarId: "local", title: input.title, body: input.body ?? "", location: input.location ?? "", begin: input.begin, end: input.end, allDay: false, recurring: false, creationId: input.creationId ?? "" });
        scene.creations.set(input.creationId ?? "", "saved");
        if (scene.lost) return Promise.reject(rejection("Calendar write could not be confirmed. Check creation receipts before retrying."));
        return Promise.resolve({ status: "saved", id, calendarId: "local", creationId: input.creationId ?? "" });
      }
      const event = find(input.id);
      if (!event || input.expected?.revision !== revisionOf(event)) return Promise.resolve({ status: "conflict" });
      Object.assign(event, { title: input.title, body: input.body ?? "", location: input.location ?? "", begin: input.begin, end: input.end });
      return Promise.resolve({ status: "saved", id: event.id, calendarId: event.calendarId });
    },
    pendingCreations: () => Promise.resolve({ status: "ready", creations: [...scene.creations].map(([creationId, status]) => ({ creationId, status })) }),
    inspectDeletion({ id }) {
      const event = find(id);
      if (!event) return Promise.resolve({ status: "conflict" });
      return Promise.resolve({
        status: "ready", recurrence: "one-off", writable: true, revision: revisionOf(event), sourceRevision: revisionOf(event),
        evidence: { selectedRow: "ParentRow", sync: "LocalUnsynced", sourceCurrent: true, bounded: true, otherExceptions: false, liveException: "NoLiveException", instances: 1, begin: event.begin, finish: event.end, exceptionOriginal: 0 },
      });
    },
    dispatchDeletion({ id }) {
      scene.phoneEvents = scene.phoneEvents.filter((event) => event.id !== id);
      return Promise.resolve({ status: "committed", readback: { parentAfter: "ParentGone", fieldsMatch: true, exclusionExact: true, cancelledAtStart: 0, instanceRemains: false } });
    },
  }));
}
