// How `pnpm check` reaches the comms stage and its open proposal to compare them with spec/telephony/comms.md (SPEC.md, "Conformance"): every event and sender goes
// through the Machine the telephony layer keeps per signed-in owner (`commsKept`), over an in-memory store, each trace with a fresh store.
import { Effect, Layer, ManagedRuntime, Stream } from "effect";
import type { Driver, Options } from "../../gen/telephony__comms.conformance.ts";
import { CloudSession } from "../../src/account/layer.vibe";
import { memoryStore } from "../../src/platform/storage.vibe";
import { commsDispatch, commsKept, commsNow } from "../../src/telephony/layer.vibe";

const signedIn = Layer.succeed(CloudSession, {
  changes: Stream.never,
  owner: () => Effect.succeed(1),
  ownerKey: (key: string) => Effect.succeed(`alpha/1/${key}`),
} as unknown as CloudSession.Shape);
const fresh = () => ManagedRuntime.make(Layer.provide(commsKept, Layer.merge(memoryStore, signedIn)));
let runtime = fresh();

export const driver: Driver & AsyncDisposable = {
  reset: async () => {
    await runtime.dispose();
    runtime = fresh();
  },
  dispatch: async (_key, event, by) => ((await runtime.runPromise(commsDispatch(event, by))) ? "accepted" : "refused"),
  observe: () => runtime.runPromise(commsNow()),
  [Symbol.asyncDispose]: () => runtime.dispose(),
};

/** The keys walks interleave. */
export const options: Options = { keys: ["stage"] };
