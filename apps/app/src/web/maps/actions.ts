// spec/maps/screen.md, "Story: Find a place"; spec/maps/guidance.md, "Story: Guide me along the route I started"; spec/maps/connection.md, "A wait Cloud names is shown and kept when it is at most a day, an allowance reset when at most 400 days, and any other wait is one minute"
import { MapsFailure } from "@elizaos/plugin-maps-client";
import { Effect, type Stream } from "effect";
import { MapsAgent } from "../../maps/agent.vibe";
import type { MapsTile } from "../../maps/cloud.vibe";
import { emptyContent, MapsContent, type MapsContentState } from "../../maps/content.vibe";
import { MapsHandoff } from "../../maps/handoff.vibe";
import { MapsSession } from "../../maps/layer.vibe";
import { MapsNavigation } from "../../maps/navigation.vibe";
import { MapsPlane } from "../../maps/plane.vibe";
import { MapsScreen } from "../../maps/screen.vibe";
import { SavedPlacesStore } from "../../maps/saved.vibe";
import * as shared from "../shell/services.ts";

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
  shared.act(Effect.flatMap(services, (s) => Effect.catch(use(s), (error) =>
    error instanceof MapsFailure ? s.content.update((c) => ({ ...c, message: error.message })) : Effect.void)));
}

/** Run one Maps action and resolve with its result, or undefined when it failed. */
export function ask<A>(use: (s: Services) => Effect.Effect<A, unknown>): Promise<A | undefined> {
  return shared.ask<A | undefined>(Effect.flatMap(services, use), undefined);
}

/** One map tile through the Maps plane; the signal cancels it and its Cloud request. Undefined when it failed or was cancelled. */
export function tileOf(z: number, x: number, y: number, signal: AbortSignal): Promise<MapsTile | undefined> {
  return shared.runtime.runPromise(Effect.flatMap(services, (s) => s.plane.tile(z, x, y)), { signal }).catch(() => undefined);
}

/** Call `each` with every value of a Maps stream until the returned stop is called. */
export function watch<A>(stream: (s: Services) => Stream.Stream<A>, each: (value: A) => void): () => void {
  return shared.watch(Effect.map(services, stream), each);
}

/** What Maps fetched for the screen: results, the shown place, routes, the position and the status line. */
export function useMapsContent(): MapsContentState {
  return shared.useServiceStream("maps.content", Effect.map(Effect.service(MapsContent), (c) => c.changes), emptyContent);
}
