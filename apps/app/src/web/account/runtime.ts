// spec/account/session.md, "Story: Sign in once for Cloud's managed services"
import { Effect, Stream } from "effect";
import { useSyncExternalStore } from "react";
import { type AppServices, runtime } from "../runtime.ts";

export { runtime };

/** Start one effect of the account services in the app runtime; its outcome is the machines' new state. */
export function act(program: Effect.Effect<unknown, unknown, AppServices>): void {
  runtime.runFork(Effect.catchCause(program, () => Effect.void));
}

const stores = new Map<string, { value: unknown; listeners: Set<() => void>; stop?: () => void }>();

/**
 * The latest value of an account stream that is not a machine's state, such as Cloud's plan offers,
 * shared by its components under `key`; `fallback` until the stream gives one.
 */
export function useAccountStream<A>(key: string, stream: Effect.Effect<Stream.Stream<A>, never, AppServices>, fallback: A): A {
  const store = stores.get(key) ?? { value: fallback, listeners: new Set<() => void>() };
  stores.set(key, store);
  const subscribe = (notify: () => void) => {
    store.listeners.add(notify);
    if (!store.stop) {
      const fiber = runtime.runFork(Effect.flatMap(stream, (s) => Stream.runForEach(s, (value) => Effect.sync(() => {
        store.value = value;
        for (const listener of store.listeners) listener();
      }))));
      store.stop = () => fiber.interruptUnsafe();
    }
    return () => {
      store.listeners.delete(notify);
      if (!store.listeners.size) {
        store.stop?.();
        store.stop = undefined;
      }
    };
  };
  return useSyncExternalStore(subscribe, () => store.value as A, () => store.value as A);
}
