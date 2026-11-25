// spec/app/account/index.md, "Story: Have the agent running"; spec/app/account/session.md, "Story: Hold the account signed in"
import { Effect, type Layer, type ManagedRuntime } from "effect";
import { useCallback, useSyncExternalStore } from "react";
import type { Resident } from "../runtime/area.tsx";
import { stamped, Time } from "../runtime/index.vibe";
import type { accountMachines } from "./account.vibe";
import { type AccountDetailsSnapshot, AccountShelf } from "./bridge.vibe";

/** Runtime type available to every Account UI component. */
export type AccountRuntime = ManagedRuntime.ManagedRuntime<Layer.Success<typeof accountMachines> | Resident, unknown>;

/** Reads the current time in whole Unix seconds from Alpha's Time service without touching Date.now(). */
export function currentSeconds(runtime: AccountRuntime): number {
  return Math.floor(runtime.runSync(Time.use((time) => time.latest())) / 1000);
}

/**
 * Wraps a generated `useMachine` hook so `can` checks evaluate at the account machines'
 * seconds clock instead of raw milliseconds.
 */
export function useAccountTimed<M extends { readonly state: unknown; readonly can: (event: never, ...by: never[]) => boolean }>(
  runtime: AccountRuntime,
  use: (runtime: AccountRuntime) => M,
): M {
  const machine = use(runtime);
  if (machine.state === undefined) return machine;
  const now = currentSeconds(runtime);
  const can = machine.can as (event: unknown, ...by: unknown[]) => boolean;
  return { ...machine, can: (event: unknown, ...by: unknown[]) => can(stamped(event, now), ...by) };
}

/** Subscribes to non-machine display metadata held in AccountShelf. */
export function useAccountShelf(runtime: AccountRuntime): AccountDetailsSnapshot {
  const shelf = runtime.runSync(AccountShelf.use((service) => Effect.succeed(service)));
  const subscribe = useCallback((notify: () => void) => shelf.subscribe(notify), [shelf]);
  const getSnapshot = useCallback(() => shelf.snapshot(), [shelf]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
