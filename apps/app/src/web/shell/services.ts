// spec/shell/index.md, "Story: Open an app from Home and keep my place"
import { type Context, Effect, Stream } from "effect";
import { useSyncExternalStore } from "react";
import { Build, type BuildInfo } from "../../platform/build.vibe";
import { runtime, type AppServices } from "../runtime.ts";

export { runtime, type AppServices };

/** Start one effect on the app's runtime without waiting for it; a failure ends it quietly and its outcome reaches components as state. */
export function act(program: Effect.Effect<unknown, unknown, AppServices>): void {
  runtime.runFork(Effect.catchCause(program, () => Effect.void));
}

/** Run one effect on the app's runtime and resolve with its answer; the promise rejects where the effect failed. */
export function perform<A>(program: Effect.Effect<A, unknown, AppServices>): Promise<A> {
  return runtime.runPromise(program);
}

/** Run one call of a service on the app's runtime and resolve with its answer; the promise rejects where the call failed. */
export function call<I extends AppServices, S, A>(service: Context.Key<I, S>, use: (shape: S) => Effect.Effect<A, unknown, AppServices>): Promise<A> {
  return runtime.runPromise(Effect.flatMap(Effect.service(service), use));
}

/** Run one effect on the app's runtime and resolve with its answer, or with `fallback` where it failed or was interrupted. */
export function ask<A>(program: Effect.Effect<A, unknown, AppServices>, fallback: A): Promise<A> {
  return runtime.runPromise(Effect.catchCause(program, () => Effect.succeed(fallback))).catch(() => fallback);
}

/** Run one effect on the app's runtime and hand its answer to `then`; a failure or interruption hands nothing. */
export function answer<A>(program: Effect.Effect<A, unknown, AppServices>, then: (value: A) => void): void {
  void runtime.runPromise(program).then(then, () => undefined);
}

/** Start one long-running effect on the app's runtime and return how to stop it. */
export function start(program: Effect.Effect<unknown, unknown, AppServices>): () => void {
  const fiber = runtime.runFork(Effect.catchCause(program, () => Effect.void));
  return () => {
    fiber.interruptUnsafe();
  };
}

/** A value read now from the app's runtime, or `fallback` where it cannot answer synchronously. */
export function now<A>(program: Effect.Effect<A, unknown, AppServices>, fallback: A): A {
  try {
    return runtime.runSync(program);
  } catch {
    return fallback;
  }
}

/** A value read now from the app's runtime by an effect that neither fails nor waits, such as a service's current state. */
export function readNow<A>(program: Effect.Effect<A, never, AppServices>): A {
  return runtime.runSync(program);
}

/** Which build is running: its variant (launcher, AOSP image or browser) and whether test mocks are allowed. */
export function buildInfo(): BuildInfo {
  return runtime.runSync(Effect.map(Effect.service(Build), (build) => build.info));
}

/** Call `each` with every value of a service stream until the returned stop is called. */
export function watch<A>(stream: Effect.Effect<Stream.Stream<A, unknown>, unknown, AppServices>, each: (value: A) => void): () => void {
  return start(Effect.flatMap(stream, (values) => Stream.runForEach(values, (value) => Effect.sync(() => each(value)))));
}

interface Store {
  value: unknown;
  readonly subscribe: (notify: () => void) => () => void;
}

const stores = new Map<string | object, Store>();

/** How a shared service stream is followed: what runs beside it, and whether its value starts over when nothing shows it. */
export interface StreamOptions {
  /** An effect that runs for as long as something shows the value, such as a read that repeats while the screen is open. */
  readonly alongside?: Effect.Effect<unknown, unknown, AppServices>;
  /** The value returns to `initial` when the last component showing it leaves, so a later viewer never sees a stale one. */
  readonly resets?: boolean;
}

/**
 * The latest value of a service stream that is not a machine's state, shared under `key` by every component that shows it;
 * `initial` until the stream gives one. The stream, and `alongside` with it, run only while something shows the value.
 */
export function useServiceStream<A>(
  key: string | object,
  stream: Effect.Effect<Stream.Stream<A, unknown>, unknown, AppServices>,
  initial: A,
  options: StreamOptions = {},
): A {
  const { alongside, resets = false } = options;
  let store = stores.get(key);
  if (store === undefined) {
    const listeners = new Set<() => void>();
    let stop: (() => void) | undefined;
    const created: Store = {
      value: initial,
      subscribe: (notify) => {
        listeners.add(notify);
        if (stop === undefined) {
          const follow = Effect.flatMap(stream, (values) => Stream.runForEach(values, (value) => Effect.sync(() => {
            created.value = value;
            for (const listener of listeners) listener();
          })));
          stop = start(alongside === undefined ? follow : Effect.all([follow, alongside], { concurrency: "unbounded" }));
        }
        return () => {
          listeners.delete(notify);
          if (listeners.size === 0) {
            stop?.();
            stop = undefined;
            if (resets) created.value = initial;
          }
        };
      },
    };
    stores.set(key, created);
    store = created;
  }
  const held = store;
  return useSyncExternalStore(held.subscribe, () => held.value as A, () => held.value as A);
}
