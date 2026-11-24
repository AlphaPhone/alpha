// How `pnpm check` reaches the Workflows place to compare it with spec/workflows/place.md (SPEC.md, "Conformance"): each event goes
// through WorkflowsPlace, the service the screen and Android's Back use, over a freshly built Workflows layer for each trace.
import { Effect, ManagedRuntime } from "effect";
import type { Driver, Options } from "../../gen/workflows__place.conformance.ts";
import { Machine } from "../../gen/workflows__place.effect.vibe";
import { WorkflowsPlace } from "../../src/workflows/place.vibe";
import { workflowsOf } from "../workflows/fakes.vibe";

const fresh = () => ManagedRuntime.make(workflowsOf([], []));
let runtime = fresh();

type PlaceEvent = Parameters<Driver["dispatch"]>[1];

const viaService = (event: PlaceEvent) => WorkflowsPlace.use((place) => {
  switch (event.type) {
    case "show": return Effect.asVoid(place.show(event.view, event.target));
    case "openOverlay":
      if (event.overlay === "SourcesOverlay") return place.openSources();
      if (event.overlay === "RemovalOverlay") return Effect.flatMap(Machine.use((held) => held.get()), (now) => (now.overlay === "SourcesOverlay" ? place.reviewRemoval() : Effect.void));
      return Effect.asVoid(place.open(event.overlay));
    case "closeOverlay": return place.close();
    case "back": return Effect.asVoid(place.back());
    case "leave": return place.leave();
    default: return Effect.asVoid(Effect.orElseSucceed(Machine.use((held) => held.send(event)), () => undefined));
  }
});

export const driver: Driver & AsyncDisposable = {
  reset: async () => {
    await runtime.dispose();
    runtime = fresh();
  },
  dispatch: async (_key, event) => {
    const before = await runtime.runPromise(Machine.use((held) => held.get()));
    await runtime.runPromise(viaService(event));
    const after = await runtime.runPromise(Machine.use((held) => held.get()));
    return JSON.stringify(before) === JSON.stringify(after) ? "refused" : "accepted";
  },
  observe: () => runtime.runPromise(Machine.use((held) => held.get())),
  [Symbol.asyncDispose]: () => runtime.dispose(),
};

/** One place per Workflows screen, so one key. */
export const options: Options = { keys: ["place"] };
