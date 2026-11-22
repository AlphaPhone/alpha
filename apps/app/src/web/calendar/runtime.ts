// spec/calendar/index.md
// The app's one runtime as Calendar uses it, and a subscription to a service's stream for React.
import { Effect, Fiber, Stream } from "effect";
import { useSyncExternalStore } from "react";
import { type AppServices, runtime } from "../runtime.ts";

export { runtime };

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
