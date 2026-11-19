import { Layer, ManagedRuntime } from "effect";
import { type ReactElement, Suspense, lazy } from "react";
import type { View } from "../gen/app__shell.ts";
import { areas } from "./areas.ts";
import type { Platform } from "./platform/platform.ts";
import { resident } from "./resident.ts";
import type { Alpha } from "./runtime/area.tsx";
import { viewOrder } from "./shell/views.tsx";

/** Alpha over `platform`: one root runtime of the resident machines, and each view's screen, loaded when it first shows. */
export function boot(platform: Layer.Layer<Platform>): Alpha {
  const runtime = ManagedRuntime.make(Layer.provideMerge(resident, platform));
  const adopted: ManagedRuntime.ManagedRuntime<never, unknown>[] = [];
  const screens: Partial<Record<View, ReactElement>> = {};
  const Assistant = lazy(async () => ({ default: (await import("./ask/index.tsx")).default.open(alpha) }));
  const alpha: Alpha = {
    runtime,
    context: Layer.effectContext(runtime.contextEffect),
    screens,
    assistant: <Suspense fallback={null}><Assistant /></Suspense>,
    adopt: (area) => { adopted.push(area); return area; },
    async dispose() {
      for (const area of adopted.splice(0)) await area.dispose();
      await runtime.dispose();
    },
  };
  for (const view of viewOrder) {
    const load = areas[view];
    if (!load) continue;
    const Screen = lazy(async () => ({ default: (await load()).default.open(alpha) }));
    screens[view] = <Suspense fallback={null}><Screen /></Suspense>;
  }
  return alpha;
}
