// spec/files/index.md
import type { Effect, ManagedRuntime } from "effect";
import { runtime } from "../shell/runtime.ts";

/** The app's runtime, which provides every Files service and machine. */
export const filesRuntime = runtime;

/** What the app's runtime provides. */
export type FilesContext = ManagedRuntime.ManagedRuntime.Context<typeof runtime>;

/** Runs one Files effect on the app's runtime and resolves with its value. */
export function run<A>(program: Effect.Effect<A, never, FilesContext>): Promise<A> {
  return filesRuntime.runPromise(program);
}

/** Starts one Files effect on the app's runtime and returns how to stop it. */
export function start(program: Effect.Effect<unknown, never, FilesContext>): () => void {
  const fiber = filesRuntime.runFork(program);
  return () => {
    fiber.interruptUnsafe();
  };
}
