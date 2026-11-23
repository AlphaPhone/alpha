// How `pnpm check` reaches the browser build's hosted result notices to compare it with spec/workflows/hostedResults.md (SPEC.md, "Conformance"): the layer keeps it in memory with
// machine(), so every event goes to the very Machine Workflows' services step, each trace on a freshly built layer.
import { Effect, ManagedRuntime } from "effect";
import type { Driver, Options } from "../../gen/workflows__hostedResults.conformance.ts";
import { Machine } from "../../gen/workflows__hostedResults.effect.vibe";
import { workflowsOf } from "../workflows/fakes.vibe";

const fresh = () => ManagedRuntime.make(workflowsOf([], [], { variant: "browser" }));
let runtime = fresh();

export const driver: Driver & AsyncDisposable = {
  reset: async () => {
    await runtime.dispose();
    runtime = fresh();
  },
  dispatch: (_key, event) => runtime.runPromise(Machine.use((held) => Effect.match(held.send(event), { onFailure: () => "refused" as const, onSuccess: () => "accepted" as const }))),
  observe: () => runtime.runPromise(Machine.use((held) => held.get())),
  receive: (_key, raw) => runtime.runPromise(Machine.use((held) => Effect.match(held.receive(raw), { onFailure: () => "refused" as const, onSuccess: () => "accepted" as const }))),
  [Symbol.asyncDispose]: () => runtime.dispose(),
};

/** One results per layer, so one key. */
export const options: Options = { keys: ["results"] };
