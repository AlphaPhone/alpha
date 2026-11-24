// How `pnpm check` reaches the owner's draft slots and requests to Alpha to compare them with spec/telephony/drafts.md (SPEC.md, "Conformance"): every event and sender goes
// through the Machine the telephony layer keeps per signed-in owner (`draftsKept`), over an in-memory store, each trace with a fresh store.
import { Effect, Layer, ManagedRuntime, Stream } from "effect";
import type { Driver, Options } from "../../gen/telephony__drafts.conformance.ts";
import { CloudSession } from "../../src/account/layer.vibe";
import { memoryStore } from "../../src/platform/storage.vibe";
import { draftsDispatch, draftsKept, draftsNow } from "../../src/telephony/layer.vibe";

const signedIn = Layer.succeed(CloudSession, {
  changes: Stream.never,
  owner: () => Effect.succeed(1),
  ownerKey: (key: string) => Effect.succeed(`alpha/1/${key}`),
} as unknown as CloudSession.Shape);
const fresh = () => ManagedRuntime.make(Layer.provide(draftsKept, Layer.merge(memoryStore, signedIn)));
let runtime = fresh();

export const driver: Driver & AsyncDisposable = {
  reset: async () => {
    await runtime.dispose();
    runtime = fresh();
  },
  dispatch: async (_key, event, by) => ((await runtime.runPromise(draftsDispatch(event, by))) ? "accepted" : "refused"),
  observe: () => runtime.runPromise(draftsNow()),
  [Symbol.asyncDispose]: () => runtime.dispose(),
};

/** The keys walks interleave. */
export const options: Options = { keys: ["thread:1", "new"] };
