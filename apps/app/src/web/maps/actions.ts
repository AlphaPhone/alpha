// spec/maps/screen.md, "Story: Find a place"; spec/maps/guidance.md, "Story: Guide me along the route I started"; spec/maps/connection.md, "A wait Cloud names is shown and kept when it is at most a day, an allowance reset when at most 400 days, and any other wait is one minute"
import { MapsFailure } from "@elizaos/plugin-maps/client/contracts";
import { Effect, Stream } from "effect";
import { useSyncExternalStore } from "react";
import { MapsAgent } from "../../maps/agent.vibe";
import { emptyContent, MapsContent, type MapsContentState } from "../../maps/content.vibe";
import { MapsHandoff } from "../../maps/handoff.vibe";
import { MapsSession } from "../../maps/layer.vibe";
import { MapsNavigation } from "../../maps/navigation.vibe";
import { MapsPlane } from "../../maps/plane.vibe";
import { MapsScreen } from "../../maps/screen.vibe";
import { SavedPlacesStore } from "../../maps/saved.vibe";
import { runtime } from "./runtime.ts";

type Services = {
  screen: MapsScreen.Shape; navigation: MapsNavigation.Shape; plane: MapsPlane.Shape; handoff: MapsHandoff.Shape;
  saved: SavedPlacesStore.Shape; session: MapsSession.Shape; agent: MapsAgent.Shape; content: MapsContent.Shape;
};

const services = Effect.all({
  screen: Effect.service(MapsScreen), navigation: Effect.service(MapsNavigation), plane: Effect.service(MapsPlane), handoff: Effect.service(MapsHandoff),
  saved: Effect.service(SavedPlacesStore), session: Effect.service(MapsSession), agent: Effect.service(MapsAgent),
  content: Effect.service(MapsContent),
});

/** Run one Maps action without awaiting it; a Maps refusal it ends in is shown on the screen's status line in Alpha's words. */
export function act(use: (s: Services) => Effect.Effect<unknown, unknown>): void {
  runtime.runFork(Effect.flatMap(services, (s) => Effect.catch(use(s), (error) =>
    error instanceof MapsFailure ? s.content.update((c) => ({ ...c, message: error.message })) : Effect.void)));
}

/** Run one Maps action and resolve with its result, or undefined when it failed. */
export function ask<A>(use: (s: Services) => Effect.Effect<A, unknown>): Promise<A | undefined> {
  return runtime.runPromise(Effect.catch(Effect.flatMap(services, use), () => Effect.succeed(undefined)));
}

let content: MapsContentState = emptyContent;
const listeners = new Set<() => void>();
let stop: (() => void) | undefined;

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  if (!stop) {
    const fiber = runtime.runFork(Effect.flatMap(Effect.service(MapsContent), (c) => Stream.runForEach(c.changes, (next) => Effect.sync(() => {
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
