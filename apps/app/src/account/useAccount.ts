// spec/app/account/index.md, "Story: Have the agent running"; spec/app/account/session.md, "Story: Hold the account signed in"
import { Effect, type Layer, type ManagedRuntime } from "effect";
import { useCallback, useSyncExternalStore } from "react";
import type { Resident } from "../runtime/ui.tsx";
import { stamped, Time } from "../runtime/index.vibe";
import type { accountMachines } from "./account.vibe";
import { type AccountDetailsSnapshot, AccountShelf } from "./bridge.vibe";

/** Runtime type available to every Account UI component. */
export type AccountRuntime = ManagedRuntime.ManagedRuntime<Layer.Success<typeof accountMachines> | Resident, unknown>;

/** Reads the current time in whole Unix milliseconds from Alpha's Time service without touching Date.now(). */
export function currentMillis(runtime: AccountRuntime): number {
  return runtime.runSync(Time.use((time) => time.latest()));
}

/**
 * Wraps a generated `useMachine` hook so `can` checks evaluate at the account machines'
 * millisecond clock.
 */
export function useAccountTimed<M extends { readonly state: unknown; readonly can: (event: never, ...by: never[]) => boolean }>(
  runtime: AccountRuntime,
  use: (runtime: AccountRuntime) => M,
): M {
  const hook = use(runtime);
  if (hook.state === undefined) return hook;
  const nowMs = currentMillis(runtime);
  const check = hook.can as (event: unknown, ...args: unknown[]) => boolean;
  return {
    ...hook,
    can(event: unknown, ...args: unknown[]) {
      return check(stamped(event, nowMs), ...args);
    },
  };
}

/** Subscribes to non-machine display metadata held in AccountShelf. */
export function useAccountShelf(runtime: AccountRuntime): AccountDetailsSnapshot {
  const shelf = runtime.runSync(AccountShelf.use((service) => Effect.succeed(service)));
  const subscribe = useCallback((notify: () => void) => shelf.subscribe(notify), [shelf]);
  const getSnapshot = useCallback(() => shelf.snapshot(), [shelf]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
