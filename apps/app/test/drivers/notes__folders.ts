// How `pnpm check` reaches the folder list to compare it with spec/notes/folders.md (SPEC.md, "Conformance"): every event
// goes through the folders service's own dispatch, over an in-memory device slot, each trace with a fresh store.
import { Effect, Layer, ManagedRuntime, Stream } from "effect";
import type { Driver, Options } from "../../gen/notes__folders.conformance.ts";
import { NotesFolders, foldersLayer } from "../../src/notes/folders.vibe";
import { Native } from "../../src/platform/native.vibe";
import { memoryStore } from "../../src/platform/storage.vibe";

const browserOnly = Layer.succeed(Native, { available: () => Effect.succeed(false), invoke: () => Effect.succeed(undefined), listen: () => Stream.empty });
const fresh = () => ManagedRuntime.make(Layer.provide(foldersLayer, Layer.merge(browserOnly, memoryStore)));
let runtime = fresh();

export const driver: Driver & AsyncDisposable = {
  reset: async () => {
    await runtime.dispose();
    runtime = fresh();
  },
  dispatch: async (_key, event) => ((await runtime.runPromise(NotesFolders.use((folders) => folders.dispatch(event)))) ? "accepted" : "refused"),
  observe: () => runtime.runPromise(NotesFolders.use((folders) => folders.state())),
  [Symbol.asyncDispose]: () => runtime.dispose(),
};

/** One folder list, so one key. */
export const options: Options = { keys: ["folders"] };
