import { Layer, ManagedRuntime } from "effect";
import type { ComponentType, ReactElement } from "react";
import type { View } from "../../gen/app__shell.ts";
import type { Platform } from "../platform/platform.ts";
import type { resident } from "../resident.ts";

/** What the root runtime gives every area: the platform and the resident machines. */
export type Resident = Platform | Layer.Success<typeof resident>;

/** Alpha as boot.tsx opened it. */
export interface Alpha {
  /** The root runtime: the platform and every resident machine, from launch to exit. */
  readonly runtime: ManagedRuntime.ManagedRuntime<Resident, unknown>;
  /** The root's services, for an area's runtime built over them: shared, never built a second time. */
  readonly context: Layer.Layer<Resident, unknown>;
  /** Each view's screen, loaded the first time it shows: an element made once, so it keeps its state across renders. */
  readonly screens: Partial<Record<View, ReactElement>>;
  /** Keeps an area's runtime until Alpha is disposed, before the root. */
  adopt<R>(runtime: ManagedRuntime.ManagedRuntime<R, unknown>): ManagedRuntime.ManagedRuntime<R, unknown>;
  dispose(): Promise<void>;
}

/** What `src/<area>/index.tsx` exports by default. */
export interface Area {
  /** The area's screen over its runtime, which is made here, when the screen is first loaded, and never during a render. */
  open(alpha: Alpha): ComponentType;
}

/**
 * An area: its own machines, which live only while Alpha does and need only resident ones, and the screen that reads
 * them and the resident machines through one runtime. The screen's `runtime` prop names the machines it reads, so an
 * area whose layer and the resident ones do not provide each of them does not compile.
 */
export function area<I, E>(layer: Layer.Layer<I, E, Resident>, Screen: ComponentType<{ runtime: ManagedRuntime.ManagedRuntime<I | Resident, unknown> }>) {
  const opened = new WeakMap<Alpha, ManagedRuntime.ManagedRuntime<I | Resident, unknown>>();
  function runtime(alpha: Alpha) {
    const known = opened.get(alpha);
    if (known) return known;
    const made = alpha.adopt(ManagedRuntime.make(Layer.provideMerge(layer, alpha.context)));
    opened.set(alpha, made);
    return made;
  }
  return {
    runtime,
    open(alpha: Alpha): ComponentType {
      const shown = runtime(alpha);
      return function Opened() {
        return <Screen runtime={shown} />;
      };
    },
  };
}
