import type { ManagedRuntime } from "effect";
import { stamped } from "./reactor.vibe";
import { Time } from "./time.vibe";

/**
 * `use(runtime)`, the generated `useMachine`, with `can` asked at Alpha's latest time: a guard that reads an event's
 * `now` or `at` says in a screen what it will say when the event is sent. A screen writes `untimed` for both and reads no clock.
 */
export function useTimed<R, M extends { readonly state: unknown; readonly can: (event: never, ...by: never[]) => boolean }>(runtime: ManagedRuntime.ManagedRuntime<R | Time, unknown>, use: (runtime: ManagedRuntime.ManagedRuntime<R | Time, unknown>) => M): M {
  const machine = use(runtime);
  if (machine.state === undefined) return machine;
  const now = runtime.runSync(Time.use((time) => time.latest()));
  const can = machine.can as (event: unknown, ...by: unknown[]) => boolean;
  return { ...machine, can: (event: unknown, ...by: unknown[]) => can(stamped(event, now), ...by) };
}
