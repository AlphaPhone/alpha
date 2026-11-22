// spec/assistant/reply.md, "Story: Read a reply with its cards"
import { Effect, type ManagedRuntime, Stream } from "effect";
import { useSyncExternalStore } from "react";

type Store<A> = { get: () => A; subscribe: (notify: () => void) => () => void };
const stores = new WeakMap<object, Map<string, Store<unknown>>>();

/** The latest value of a service stream the runtime provides, shared by every component that reads it under the same name. */
export function useServiceStream<R, A>(runtime: ManagedRuntime.ManagedRuntime<R, unknown>, name: string, stream: Effect.Effect<Stream.Stream<A>, never, R>, start: A): A {
  const byName = stores.get(runtime) ?? new Map<string, Store<unknown>>();
  stores.set(runtime, byName);
  const known = byName.get(name) as Store<A> | undefined;
  const store: Store<A> = known ?? (() => {
    let seen = start;
    const listeners = new Set<() => void>();
    let stop: (() => void) | undefined;
    const made: Store<A> = {
      get: () => seen,
      subscribe: (notify) => {
        listeners.add(notify);
        if (stop === undefined) {
          const fiber = runtime.runFork(Effect.flatMap(stream, (changes) => Stream.runForEach(changes, (value) => Effect.sync(() => {
            seen = value;
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
    byName.set(name, made as Store<unknown>);
    return made;
  })();
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
