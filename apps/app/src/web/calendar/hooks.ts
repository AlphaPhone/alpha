// spec/calendar/index.md
// The Calendar services' state for components, each subscribed once while something shows it.
import { Effect, Stream } from "effect";
import { initial as agentInitial } from "../../../gen/calendar__agent.ts";
import { initial as reviewInitial } from "../../../gen/calendar__approvals.ts";
import { initial as heldInitial } from "../../../gen/calendar__deletions.ts";
import { initial as draftInitial } from "../../../gen/calendar__drafts.ts";
import { initial as actionInitial } from "../../../gen/calendar__deviceActions.ts";
import { initial as writesInitial } from "../../../gen/calendar__device.ts";
import { initial as linkInitial } from "../../../gen/calendar__googleLink.ts";
import { AgentCalendar, type AgentView } from "../../calendar/agent.vibe";
import { ApprovalReviews, type ApprovalSheet } from "../../calendar/approvals.vibe";
import { whileVisible } from "../../calendar/binding.vibe";
import { HeldDeletions } from "../../calendar/deletions.vibe";
import { DeviceCalendar, type DeviceRead } from "../../calendar/device.vibe";
import { CalendarDrafts } from "../../calendar/drafts.vibe";
import { HomeAgenda, type HomeAgendaCard } from "../../calendar/home.vibe";
import { CalendarLink, type CalendarLinkView } from "../../calendar/link.vibe";
import { AgentRequests, type RequestSheet } from "../../calendar/requests.vibe";
import { openRoute } from "../../calendar/screen.vibe";
import { useServiceStream } from "../shell/services.ts";

const keys = {
  writes: {}, agent: {}, device: {}, drafts: {}, held: {}, approval: {}, requests: {}, actions: {}, home: {}, link: {},
};

const agentView: AgentView = { state: agentInitial, feed: undefined, calendars: [], upcoming: undefined, savedAt: undefined, window: undefined };
const deviceRead: DeviceRead = { status: "not-connected", range: undefined, events: [], calendars: [], truncated: false, readAt: undefined };

/** The agent Calendar while Calendar shows it; showing it reads now and once a minute. */
export function useAgentView(): AgentView {
  return useServiceStream(keys.agent, AgentCalendar.use((service) => Effect.succeed(service.changes)), agentView, { alongside: whileVisible().pipe(Effect.orDie, Effect.asVoid) });
}

/** The device calendars' last read. */
export function useDeviceRead(): DeviceRead {
  return useServiceStream(keys.device, DeviceCalendar.use((service) => Effect.succeed(service.reads)), deviceRead);
}

/** The open editor's retained draft. */
export function useDraft() {
  return useServiceStream(keys.drafts, CalendarDrafts.use((service) => Effect.succeed(service.changes)), draftInitial);
}

/** The agent Calendar deletions held for Undo. */
export function useHeld() {
  return useServiceStream(keys.held, HeldDeletions.use((service) => Effect.succeed(service.changes)), heldInitial);
}

/** The approval review sheet. */
export function useApprovalSheet(): ApprovalSheet {
  return useServiceStream(keys.approval, ApprovalReviews.use((service) => Effect.succeed(service.changes)), { state: reviewInitial, row: undefined, presentation: undefined, answer: undefined });
}

/** The review sheet an agent request waits on. */
export function useRequestSheet(): RequestSheet {
  return useServiceStream(keys.requests, AgentRequests.use((service) => Effect.succeed(service.sheets)), { kind: "none" } as RequestSheet);
}

/** The agent's device action in progress. */
export function useDeviceAction() {
  return useServiceStream(keys.actions, AgentRequests.use((service) => Effect.succeed(service.actions)), actionInitial);
}

/** Home's agenda card. */
export function useHomeAgenda(): HomeAgendaCard {
  return useServiceStream(keys.home, HomeAgenda.use((service) => Effect.succeed(service.cards)),
    { state: "HomeQuiet", title: "Calendar", begin: undefined, end: undefined, allDay: false, video: false, route: undefined, day: 0, rereads: false });
}

/** Calendar's Google Calendar row and link setup. */
export function useCalendarLink(): CalendarLinkView {
  return useServiceStream(keys.link, CalendarLink.use((service) => Effect.succeed(service.changes)),
    { row: "RowNotConnected", link: linkInitial, destination: "", held: 0, running: false, pause: undefined });
}

/** The device calendar writes: the form, the write in flight and the event an unconfirmed write holds. */
export function useDeviceWrites() {
  return useServiceStream(keys.writes, DeviceCalendar.use((service) => Effect.succeed(service.writes)), writesInitial);
}

const routeKeys = new Map<string, object>();

/** Opens the route Calendar was opened at, once per route, while the screen shows it. */
export function useRouteOpen(route: string | undefined): void {
  const key = route ?? "";
  let token = routeKeys.get(key);
  if (token === undefined) {
    token = {};
    routeKeys.set(key, token);
  }
  useServiceStream(token, Effect.succeed(Stream.empty), undefined, { alongside: route === undefined ? Effect.void : openRoute(route).pipe(Effect.orDie, Effect.asVoid) });
}
