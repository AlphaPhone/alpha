// spec/clock/index.md
// How Clock's components reach their services: the app's one runtime, built from every area's layer.
import { Effect } from "effect";
import { runtime } from "../runtime.ts";
import { Build } from "../../platform/build.vibe";

export { runtime };

/** Starts one of Clock's effects on the app runtime; the component never waits on it. */
export function run<A, E, R>(program: Effect.Effect<A, E, R>): void {
  runtime.runFork(program as Effect.Effect<A, E, never>);
}

/** Which build this is: the browser build keeps its own alarms; the AOSP image adds telephony. */
export function buildInfo() {
  return runtime.runSync(Effect.map(Effect.service(Build), (build) => build.info));
}
