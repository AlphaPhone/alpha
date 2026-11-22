// spec/maps/screen.md, "Story: Find a place"; spec/maps/guidance.md, "Story: Guide me along the route I started"
import { Effect, Stream } from "effect";
import { useSyncExternalStore } from "react";
import { MapsAgent } from "../../maps/agent.vibe";
import { emptyContent, MapsContent, type MapsContentState } from "../../maps/content.vibe";
import { MapsHandoff } from "../../maps/handoff.vibe";
import { MapsSession } from "../../maps/layer.vibe";
import { Navigation } from "../../maps/navigation.vibe";
import { MapsPlane } from "../../maps/plane.vibe";
import { MapsScreen } from "../../maps/screen.vibe";
import { SavedPlacesStore } from "../../maps/saved.vibe";

import { runtime } from "../runtime.ts";

/** The app's one runtime, which provides every Maps service and machine. */
export const mapsRuntime = runtime;

type Services = {
  screen: MapsScreen.Shape; navigation: Navigation.Shape; plane: MapsPlane.Shape; handoff: MapsHandoff.Shape;
  saved: SavedPlacesStore.Shape; session: MapsSession.Shape; agent: MapsAgent.Shape;
};

const services = Effect.all({
  screen: Effect.service(MapsScreen), navigation: Effect.service(Navigation), plane: Effect.service(MapsPlane), handoff: Effect.service(MapsHandoff),
  saved: Effect.service(SavedPlacesStore), session: Effect.service(MapsSession), agent: Effect.service(MapsAgent),
});

/** Run one Maps action; its failure is already shown on the screen, so the result is not awaited. */
export function act(use: (s: Services) => Effect.Effect<unknown, unknown>): void {
  mapsRuntime.runFork(Effect.flatMap(services, use));
}

/** Run one Maps action and resolve with its result, or undefined when it failed. */
export function ask<A>(use: (s: Services) => Effect.Effect<A, unknown>): Promise<A | undefined> {
  return mapsRuntime.runPromise(Effect.catch(Effect.flatMap(services, use), () => Effect.succeed(undefined)));
}

let content: MapsContentState = emptyContent;
const listeners = new Set<() => void>();
let stop: (() => void) | undefined;

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  if (!stop) {
    const fiber = mapsRuntime.runFork(Effect.flatMap(Effect.service(MapsContent), (c) => Stream.runForEach(c.changes, (next) => Effect.sync(() => {
      content = next;
      for (const listener of listeners) listener();
    }))));
    stop = () => fiber.interruptUnsafe();
  }
  return () => {
    listeners.delete(notify);
    if (!listeners.size) { stop?.(); stop = undefined; }
  };
}

/** What Maps fetched for the screen: results, the shown place, routes, the position and the status line. */
export function useMapsContent(): MapsContentState {
  return useSyncExternalStore(subscribe, () => content, () => content);
}
