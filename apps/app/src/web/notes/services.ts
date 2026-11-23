// spec/notes/index.md
import { Effect, Stream, type Context } from "effect";
import { useSyncExternalStore } from "react";
import { type AppServices, runtime } from "./runtime.ts";

/** Run one call of a Notes service on the app's runtime and resolve with its result. */
export function call<I extends AppServices, S, A>(service: Context.Key<I, S>, use: (shape: S) => Effect.Effect<A, unknown, AppServices>): Promise<A> {
  return runtime.runPromise(Effect.flatMap(Effect.service(service), use));
}

const stores = new Map<object, { value: unknown; subscribe: (notify: () => void) => () => void }>();

/** The latest value of a Notes service's stream of shown state, such as the collection or the open draft. */
export function useServiceStream<I extends AppServices, S, A>(service: Context.Key<I, S>, select: (shape: S) => Stream.Stream<A>, initial: A): A {
  const key = select as object;
  let store = stores.get(key);
  if (store === undefined) {
    const listeners = new Set<() => void>();
    let stop: (() => void) | undefined;
    const created = {
      value: initial as unknown,
      subscribe: (notify: () => void) => {
        listeners.add(notify);
        if (stop === undefined) {
          const fiber = runtime.runFork(Effect.flatMap(Effect.service(service), (shape) => Stream.runForEach(select(shape), (value) => Effect.sync(() => {
            created.value = value;
            for (const listener of listeners) listener();
          }))));
          stop = () => fiber.interruptUnsafe();
        }
        return () => {
          listeners.delete(notify);
          if (listeners.size === 0) { stop?.(); stop = undefined; }
        };
      },
    };
    stores.set(key, created);
    store = created;
  }
  const held = store;
  return useSyncExternalStore(held.subscribe, () => held.value as A, () => held.value as A);
}
