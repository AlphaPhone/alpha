// spec/calendar/index.md
// The Calendar services' state for components, each subscribed once while something shows it.
import { Effect, Fiber, Stream } from "effect";
import { useSyncExternalStore } from "react";
import { initial as agentInitial } from "../../../gen/calendar__agent.ts";
import { initial as reviewInitial } from "../../../gen/calendar__approvals.ts";
import { initial as heldInitial } from "../../../gen/calendar__deletions.ts";
import { initial as draftInitial } from "../../../gen/calendar__drafts.ts";
import { initial as controlInitial } from "../../../gen/calendar__sync.ts";
import { initial as linkInitial } from "../../../gen/calendar__googleLink.ts";
import { initial as nativeInitial } from "../../../gen/calendar__nativeSync.ts";
import { initial as disconnectInitial } from "../../../gen/calendar__disconnect.ts";
import { initial as actionInitial } from "../../../gen/calendar__deviceActions.ts";
import { initial as writesInitial } from "../../../gen/calendar__device.ts";
import { AgentCalendar, type AgentView } from "../../calendar/agent.vibe";
import { ApprovalReviews, type ApprovalSheet } from "../../calendar/approvals.vibe";
import { whileVisible } from "../../calendar/binding.vibe";
import { HeldDeletions } from "../../calendar/deletions.vibe";
import { DeviceCalendar, type DeviceRead } from "../../calendar/device.vibe";
import { CalendarDrafts } from "../../calendar/drafts.vibe";
import { HomeAgenda, type HomeAgendaCard } from "../../calendar/home.vibe";
import { AgentRequests, type RequestSheet } from "../../calendar/requests.vibe";
import { CalendarSync, type SyncView } from "../../calendar/sync.vibe";
import { openRoute } from "../../calendar/screen.vibe";
import type { AppServices } from "../runtime.ts";
import { runtime } from "./runtime.ts";

/** The services the runtime provides, Calendar's among them. */
export type CalendarServices = AppServices;

/** Run one effect of a Calendar service; its failure is the effect's own concern. */
export function run<A, E>(effect: Effect.Effect<A, E, CalendarServices>): Promise<A> {
  return runtime.runPromise(effect);
}

type Store<A> = { value: A; subscribe: (notify: () => void) => () => void };
const stores = new WeakMap<object, Store<unknown>>();

/** A stream's latest value, read with React's external-store subscription; `alongside` runs for as long as anything subscribes. */
export function useStream<A>(key: object, stream: Effect.Effect<Stream.Stream<A>, never, CalendarServices>, initial: A, alongside?: Effect.Effect<void, never, CalendarServices>): A {
  let store = stores.get(key) as Store<A> | undefined;
  if (store === undefined) {
    const listeners = new Set<() => void>();
    let fiber: Fiber.Fiber<void> | undefined;
    const created: Store<A> = {
      value: initial,
      subscribe: (notify) => {
        listeners.add(notify);
        if (fiber === undefined) {
          const follow = Effect.flatMap(stream, (values) => Stream.runForEach(values, (value) => Effect.sync(() => {
            created.value = value;
            for (const listener of listeners) listener();
          })));
          fiber = runtime.runFork(alongside === undefined ? follow : Effect.asVoid(Effect.all([follow, alongside], { concurrency: "unbounded" })));
        }
        return () => {
          listeners.delete(notify);
          if (listeners.size === 0 && fiber !== undefined) {
            runtime.runFork(Fiber.interrupt(fiber));
            fiber = undefined;
          }
        };
      },
    };
    stores.set(key, created as Store<unknown>);
    store = created;
  }
  const kept = store;
  return useSyncExternalStore(kept.subscribe, () => kept.value, () => kept.value);
}

const keys = {
  writes: {}, agent: {}, device: {}, drafts: {}, held: {}, approval: {}, requests: {}, actions: {}, sync: {}, home: {},
};

const agentView: AgentView = { state: agentInitial, feed: undefined, calendars: [], upcoming: undefined, savedAt: undefined, window: undefined };
const deviceRead: DeviceRead = { status: "not-connected", range: undefined, events: [], calendars: [], truncated: false, readAt: undefined };

/** The agent Calendar while Calendar shows it; showing it reads now and once a minute. */
export function useAgentView(): AgentView {
  return useStream(keys.agent, AgentCalendar.use((service) => Effect.succeed(service.changes)), agentView, whileVisible().pipe(Effect.orDie, Effect.asVoid));
}

/** The device calendars' last read. */
export function useDeviceRead(): DeviceRead {
  return useStream(keys.device, DeviceCalendar.use((service) => Effect.succeed(service.reads)), deviceRead);
}

/** The open editor's retained draft. */
export function useDraft() {
  return useStream(keys.drafts, CalendarDrafts.use((service) => Effect.succeed(service.changes)), draftInitial);
}

/** The agent Calendar deletions held for Undo. */
export function useHeld() {
  return useStream(keys.held, HeldDeletions.use((service) => Effect.succeed(service.changes)), heldInitial);
}

/** The approval review sheet. */
export function useApprovalSheet(): ApprovalSheet {
  return useStream(keys.approval, ApprovalReviews.use((service) => Effect.succeed(service.changes)), { state: reviewInitial, row: undefined, presentation: undefined, answer: undefined });
}

/** The review sheet an agent request waits on. */
export function useRequestSheet(): RequestSheet {
  return useStream(keys.requests, AgentRequests.use((service) => Effect.succeed(service.sheets)), { kind: "none" } as RequestSheet);
}

/** The agent's device action in progress. */
export function useDeviceAction() {
  return useStream(keys.actions, AgentRequests.use((service) => Effect.succeed(service.actions)), actionInitial);
}

/** The sync sheet's state. */
export function useSyncView(): SyncView {
  return useStream(keys.sync, CalendarSync.use((service) => Effect.succeed(service.changes)),
    { control: controlInitial, link: linkInitial, device: nativeInitial, disconnect: disconnectInitial, review: undefined, links: undefined });
}

/** Home's agenda card. */
export function useHomeAgenda(): HomeAgendaCard {
  return useStream(keys.home, HomeAgenda.use((service) => Effect.succeed(service.cards)),
    { state: "HomeQuiet", title: "Calendar", begin: undefined, end: undefined, allDay: false, video: false, route: undefined, day: 0, rereads: false });
}

/** The device calendar writes: the form, the write in flight and the event an unconfirmed write holds. */
export function useDeviceWrites() {
  return useStream(keys.writes, DeviceCalendar.use((service) => Effect.succeed(service.writes)), writesInitial);
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
  useStream(token, Effect.succeed(Stream.empty), undefined, route === undefined ? Effect.void : openRoute(route).pipe(Effect.orDie, Effect.asVoid));
}
