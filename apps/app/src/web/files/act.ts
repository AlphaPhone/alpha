// spec/files/index.md
import type { Effect } from "effect";
import { runtime, type AppServices } from "./runtime.ts";

/** Runs one Files effect on the app's runtime and resolves with its value. */
export function run<A>(program: Effect.Effect<A, never, AppServices>): Promise<A> {
  return runtime.runPromise(program);
}

/** Starts one Files effect on the app's runtime and returns how to stop it. */
export function start(program: Effect.Effect<unknown, never, AppServices>): () => void {
  const fiber = runtime.runFork(program);
  return () => {
    fiber.interruptUnsafe();
  };
}
