import { Effect, Layer } from "effect";
import { type ReactElement, Suspense, lazy } from "react";
import { type Mount, type Place, mounts as every } from "./areas.ts";
import type { Platform } from "./platform/platform.vibe";
import { resident } from "./resident.vibe";
import type { Alpha } from "./runtime/area.tsx";
import { Contained } from "./runtime/contained.tsx";
import { rooted } from "./runtime/root.vibe";
import { back, taking } from "./shell/shell.vibe";

/** Alpha over `platform`: one root runtime of the resident machines, and each screen of `mounts` at its place, loaded when it is first drawn, and contained: one that throws or cannot be loaded stops alone. */
export function boot(platform: Layer.Layer<Platform>, mounts: readonly Mount[] = every): Alpha {
  const root = rooted(Layer.provideMerge(resident, platform));
  const placed = new Map<Place, ReactElement[]>();
  const alpha: Alpha = {
    runtime: root.runtime,
    over: (layer) => root.over(layer),
    slot: (place) => placed.get(place),
    back: () => root.runtime.runPromiseExit(back()),
    taking: (place, took) => void root.runtime.runPromiseExit(taking(place, took)),
    dispose: root.dispose,
  };
  const stopped = (place: string, cause: unknown) => void root.runtime.runPromiseExit(Effect.logError(`the screen at ${place} stopped`, cause));
  for (const mount of mounts) {
    const Screen = mount.first?.open(alpha, mount.at) ?? lazy(async () => ({ default: (await mount.load()).default.open(alpha, mount.at) }));
    const drawn = (
      <Contained key={`${mount.at} ${placed.get(mount.at)?.length ?? 0}`} place={mount.at} told={mount.at.startsWith("view:")} onStopped={stopped}>
        <Suspense fallback={null}><Screen /></Suspense>
      </Contained>
    );
    placed.set(mount.at, [...(placed.get(mount.at) ?? []), drawn]);
  }
  return alpha;
}
