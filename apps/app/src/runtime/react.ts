import type { ManagedRuntime } from "effect";
import { Time } from "./time.vibe";

function stamped<A>(event: A, now: number): A {
  return typeof event === "object" && event !== null && "now" in event ? { ...event, now } : event;
}

/**
 * `use(runtime)`, the generated `useMachine`, with `can` asked at Alpha's latest time: a guard that reads an event's
 * `now` says in a screen what it will say when the event is sent. A screen writes `now: untimed` and reads no clock.
 */
export function useTimed<R, M extends { readonly state: unknown; readonly can: (event: never, ...by: never[]) => boolean }>(runtime: ManagedRuntime.ManagedRuntime<R | Time, unknown>, use: (runtime: ManagedRuntime.ManagedRuntime<R | Time, unknown>) => M): M {
  const machine = use(runtime);
  if (machine.state === undefined) return machine;
  const now = runtime.runSync(Time.use((time) => time.latest()));
  const can = machine.can as (event: unknown, ...by: unknown[]) => boolean;
  return { ...machine, can: (event: unknown, ...by: unknown[]) => can(stamped(event, now), ...by) };
}
