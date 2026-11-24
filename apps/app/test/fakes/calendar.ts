// spec/app/calendar/index.md, "Story: See only what the current read found, for the current account"
import type { AndroidCalendarEvent, AndroidCalendarList, AndroidCalendarPlugin, AndroidCalendarRow } from "@elizaos/os/bridges/definitions/calendar";
import { type Faked, plugin } from "./phone.ts";
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

/** One event of the agent's Calendar as eliza's calendar routes answer it (`.eliza/packages/plugin-calendar/src/model.vibe`, `CalendarEvent`). */
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
}

export function calendarScene(): CalendarScene {
  return {
    events: [], writes: [], keys: new Map(), down: false, stalled: false, queued: false,
    calendars: [{ id: "local", name: "Phone", writable: true, local: true }], phoneEvents: [], granted: false, asked: 0,
  };
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
  return [
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
        if (scene.queued) return Response.json({ approvalRequestId: "approval-1" }, { status: 202 });
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

/**
 * `CalendarPlugin.java`, the `ElizaCalendar` plugin, as far as a read goes: Android's one prompt for Calendar access,
 * and the phone's calendars and events of a range, which it lists only once access is granted.
 */
export function elizaCalendar(scene: CalendarScene): Faked {
  return plugin<AndroidCalendarPlugin>(() => ({
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
    insertHandoff: () => Promise.resolve({ status: "unavailable" }),
    inspect: () => Promise.resolve({ status: "unavailable" }),
    save: () => Promise.resolve({ status: "conflict" }),
    inspectDeletion: () => Promise.resolve({ status: "unavailable" }),
    dispatchDeletion: () => Promise.resolve({ status: "unknown" }),
  }));
}
