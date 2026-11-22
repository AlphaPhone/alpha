// spec/workflows/index.md
// How Workflows' components reach their services: the app's one runtime, which the shell builds from every area's layer.
import type { Effect } from "effect";
import { runtime, type AppServices } from "../runtime.ts";

export { runtime };

/** Run one Workflows effect for a control and resolve with its answer; Workflows' service methods never fail. */
export function perform<A>(program: Effect.Effect<A, never, AppServices>): Promise<A> {
  return runtime.runPromise(program);
}
