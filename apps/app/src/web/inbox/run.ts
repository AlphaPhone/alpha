// spec/inbox/accounts.md, "Story: Choose which Gmail account my Inbox shows"
import { Effect } from "effect";
import { runtime, type AppServices } from "./runtime.ts";

/** Starts one effect of the Inbox services; its outcome reaches the components as machine state. */
export function act(program: Effect.Effect<unknown, unknown, AppServices>): void {
  runtime.runFork(program);
}

/** Runs one effect of the Inbox services and hands its result to `then`, as an event handler does with a refusal to show. */
export function ask<A>(program: Effect.Effect<A, unknown, AppServices>, then: (value: A) => void): void {
  runtime.runFork(Effect.tap(program, (value) => Effect.sync(() => then(value))));
}
