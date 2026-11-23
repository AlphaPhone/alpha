// spec/calendar/agent.md, "Story: See my agent's Calendar for the account I am signed in to"
// The resident agent's calendar routes and the AlphaCalendar plugin, faked once at their boundary for the calendar journeys.

const DAY = 86_400_000;

/** One stored agent Calendar event. */
export interface FakeEvent { id: string; title: string; startAt: string; endAt: string; etag: string; status: string }

/** The agent's calendar routes over a list of events in its own calendar. */
export class CalendarAgentFake {
  events: FakeEvent[] = [];
  agentId = "agent-1";
  approvals: Record<string, unknown>[] = [];
  resolved: { id: string; body: unknown }[] = [];
  writes: { method: string; path: string; body: unknown }[] = [];
  refuseReads = false;
  /** The linked-sync control, its writable Google calendars and the linked events, as upstream's sync-control routes keep them. */
  control = { revision: 0, paused: true, destination: null as { connectorAccountId: string; providerCalendarId: string } | null, pendingDispatch: null, conflicts: 0 };
  candidates: { connectorAccountId: string; providerCalendarId: string; side: "owner"; accessRole: string; primary: boolean; accountEmail: string | null }[] = [];
  links: { linkId: string; localEventId: string; destination: { connectorAccountId: string; providerCalendarId: string } | null; providerEventId: string | null; handoffKey: string; localOnly: boolean; staged: boolean; state: string }[] = [];
  controlWrites: string[] = [];

  private event(record: FakeEvent) {
    return {
      id: record.id, externalId: record.id, agentId: this.agentId, provider: "eliza", side: "owner", calendarId: "primary", title: record.title,
      description: "", location: "", status: record.status, startAt: record.startAt, endAt: record.endAt, isAllDay: false, timezone: "UTC",
      htmlLink: null, conferenceLink: null, organizer: { self: true }, attendees: [], metadata: { etag: record.etag }, syncedAt: record.startAt,
      updatedAt: record.startAt, grantId: "eliza-calendar", connectorAccountId: "",
    };
  }

  private calendar() {
    return { provider: "eliza", side: "owner", grantId: "eliza-calendar", connectorAccountId: "", calendarId: "primary", accountEmail: "owner@example.com",
      summary: "Agent Calendar", description: null, primary: true, accessRole: "owner", timeZone: "UTC", selected: true, includeInFeed: true };
  }

  /** One JSON request; a refusal throws an object with the status. */
  json(method: string, path: string, body: unknown): { status: number; data: unknown } {
    const url = new URL(path, "http://agent.test");
    if (this.refuseReads && method === "GET") throw Object.assign(new Error("refused"), { status: 401 });
    if (url.pathname === "/api/lifeops/calendar/feed") {
      const timeMin = url.searchParams.get("timeMin") ?? "";
      const timeMax = url.searchParams.get("timeMax") ?? "";
      const begin = Date.parse(timeMin);
      const end = Date.parse(timeMax);
      const events = this.events.filter((event) => Date.parse(event.startAt) < end && Date.parse(event.endAt) > begin).map((event) => this.event(event));
      return { status: 200, data: { calendarId: "primary", events, source: "synced", state: "complete", sources: [], timeMin, timeMax, syncedAt: timeMin } };
    }
    if (url.pathname === "/api/lifeops/calendar/calendars") return { status: 200, data: { calendars: [this.calendar()] } };
    if (url.pathname === "/api/lifeops/calendar/next-context") {
      const next = this.events.find((event) => event.status !== "cancelled");
      return { status: 200, data: { event: next ? this.event(next) : null, calendarFeedState: "complete" } };
    }
    if (url.pathname === "/api/lifeops/calendar/events" && method === "POST") {
      this.writes.push({ method, path, body });
      const request = body as { title: string; startAt: string; endAt: string; idempotencyKey: string };
      const created: FakeEvent = { id: `event-${this.events.length + 1}`, title: request.title, startAt: request.startAt, endAt: request.endAt, etag: "etag-1", status: "confirmed" };
      this.events.push(created);
      return { status: 200, data: { event: this.event(created), receipt: { operation: "create", source: this.sourceKey(), eventId: created.id, providerVersion: created.etag, event: this.event(created), target: null, acceptedAt: created.startAt } } };
    }
    const match = /^\/api\/lifeops\/calendar\/events\/(.+)$/.exec(url.pathname);
    if (match) {
      this.writes.push({ method, path, body });
      const target = this.events.find((event) => event.id === decodeURIComponent(match[1]!));
      if (!target) throw Object.assign(new Error("missing"), { status: 404 });
      const request = body as { expectedProviderVersion: string };
      if (request.expectedProviderVersion !== target.etag) throw Object.assign(new Error("version"), { status: 409 });
      if (method === "DELETE") {
        this.events = this.events.filter((event) => event !== target);
        return { status: 200, data: { deleted: true, event: null, receipt: { operation: "delete", source: this.sourceKey(), eventId: target.id, providerVersion: `deleted:${target.etag}`, event: null, target: this.event(target), acceptedAt: target.startAt } } };
      }
      Object.assign(target, { title: (body as { title?: string }).title ?? target.title, etag: `${target.etag}+` });
      return { status: 200, data: { event: this.event(target), receipt: { operation: "update", source: this.sourceKey(), eventId: target.id, providerVersion: target.etag, event: this.event(target), target: this.event(target), acceptedAt: target.startAt } } };
    }
    if (url.pathname === "/api/lifeops/calendar/sync-control" && method === "GET") return { status: 200, data: { ...this.control } };
    if (url.pathname === "/api/lifeops/calendar/sync-control" && method === "POST") {
      const request = body as { operation: string; expectedRevision: number; destination?: { connectorAccountId: string; providerCalendarId: string } | null };
      if (request.expectedRevision !== this.control.revision) throw Object.assign(new Error("changed"), { status: 409 });
      this.controlWrites.push(request.operation);
      const destination = request.operation === "select" ? request.destination ?? null : this.control.destination;
      this.control = { ...this.control, revision: this.control.revision + 1, destination,
        paused: request.operation === "resume" ? false : request.operation === "pause" ? true : this.control.paused };
      return { status: 200, data: { ...this.control, receipt: { id: `r-${this.control.revision}`, operationKey: "k", committedAt: "2026-11-23T00:00:00Z", revision: this.control.revision, replayed: false } } };
    }
    if (url.pathname === "/api/lifeops/calendar/sync-control/destinations") {
      return { status: 200, data: { revision: this.control.revision, choice: "SelectPrimary", destination: this.control.destination, candidates: this.candidates } };
    }
    if (url.pathname === "/api/lifeops/calendar/links") return { status: 200, data: { links: this.links } };
    if (url.pathname === "/api/approvals") return { status: 200, data: { approvals: this.approvals } };
    const resolve = /^\/api\/approvals\/(.+)\/resolve$/.exec(url.pathname);
    if (resolve) {
      this.resolved.push({ id: resolve[1]!, body });
      const decision = (body as { decision: string }).decision;
      return { status: 200, data: { requestId: resolve[1], decision, kind: decision === "approve" ? "succeeded" : "rejected", text: "Done." } };
    }
    throw Object.assign(new Error(`no route ${method} ${path}`), { status: 404 });
  }

  private sourceKey() {
    return { provider: "eliza", side: "owner", grantId: "eliza-calendar", connectorAccountId: "", calendarId: "primary" };
  }

  /** Add an event today at `hour` UTC. @throws {never} */
  add(id: string, title: string, day: number, hour: number) {
    const start = Math.floor(Date.now() / DAY) * DAY + day * DAY + hour * 3_600_000;
    this.events.push({ id, title, startAt: new Date(start).toISOString(), endAt: new Date(start + 3_600_000).toISOString(), etag: "etag-1", status: "confirmed" });
  }
}

/** The AlphaCalendar plugin over one local calendar and its creation journal. */
export class DeviceCalendarFake {
  creations: { creationId: string; status: "saved" | "unknown" }[] = [];
  events: { id: string; calendarId: string; title: string; body: string; location: string; begin: number; end: number; revision: string }[] = [];
  loseNextSave = false;
  calls: string[] = [];

  available(plugin: string): boolean {
    return plugin === "AlphaCalendar";
  }

  invoke(_plugin: string, method: string, args: Record<string, unknown>): unknown {
    this.calls.push(method);
    switch (method) {
      case "requestAccess": return { status: "granted" };
      case "list": return { status: "ready", events: this.events, calendars: [{ id: "1", name: "On this phone", account: "Alpha Phone", writable: true, local: true }], truncated: false };
      case "pendingCreations": return { status: "ready", creations: this.creations };
      case "acknowledgeCreation": this.creations = this.creations.filter((entry) => entry.creationId !== args.creationId); return { status: "acknowledged" };
      case "prepareAgentSource": return { status: "ready", sourceId: "native:1", sourceRevision: "r1" };
      case "save": {
        if (this.loseNextSave) {
          this.loseNextSave = false;
          this.creations.push({ creationId: String(args.creationId), status: "unknown" });
          throw Object.assign(new Error("lost"), { code: "timeout" });
        }
        const id = String(this.events.length + 1);
        this.events.push({ id, calendarId: "1", title: String(args.title), body: String(args.body), location: String(args.location), begin: Number(args.begin), end: Number(args.end), revision: "r1" });
        this.creations.push({ creationId: String(args.creationId), status: "saved" });
        return { status: "saved", id, creationId: args.creationId };
      }
      default: return { status: "unavailable" };
    }
  }
}
