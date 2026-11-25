import type { Effect, Layer, ManagedRuntime } from "effect";
import type { ComponentType, ReactNode } from "react";
import type { Place } from "../areas.ts";
import type { MediaHandoff } from "../assistant/attachments.vibe";
import type { Platform } from "../platform/platform.vibe";
import type { resident } from "../resident.vibe";
import type { Whole } from "./reactor.vibe";

/** What the root runtime gives every area: the platform and the resident machines. */
export type Resident = Platform | MediaHandoff | Layer.Success<typeof resident>;

/** Alpha as boot.tsx opened it. */
export interface Alpha {
  /** The root runtime: the platform and every resident machine, from launch to exit. */
  readonly runtime: ManagedRuntime.ManagedRuntime<Resident, unknown>;
  /** A runtime of an area's own machines over the root's, made once and kept until Alpha is disposed. */
  over<I, E>(layer: Layer.Layer<I, E, Resident | NoInfer<I> | Whole>): ManagedRuntime.ManagedRuntime<I | Resident, unknown>;
  /** The screens mounted at `place` (areas.ts), each loaded the first time it is drawn: what a screen draws where it offers other areas a place. */
  slot(place: Place): ReactNode;
  /** Back, from the header as from the phone: the shell's layers first, then the screen showing, then the app on top. */
  back(): Promise<unknown>;
  /** While the screen at `place` shows, ask `took` for each Back: whether the screen went back a step of its own. */
  taking(place: Place, took: () => Promise<boolean>): void;
  dispose(): Promise<void>;
}

/** What a screen is given: the runtime of its machines, and Alpha, for the places it offers. */
export interface Shown<R> {
  runtime: ManagedRuntime.ManagedRuntime<R, unknown>;
  alpha: Alpha;
}

/** What `src/<area>/index.tsx` exports by default, and what each further screen of an area exports. */
export interface Area {
  /** The screen at `place` over the area's runtime, which is made here, when the screen is first loaded, and never during a render. */
  open(alpha: Alpha, place: Place): ComponentType;
}

/**
 * An area's screen and the machines only it needs, which live from the screen's first load until Alpha closes and
 * may follow or tell the resident ones. The screen's `runtime` prop names the machines it reads: where `layer` and
 * the resident machines do not provide each of them, this does not compile. `back` is the screen's own step back,
 * such as from a thread to its list: it says whether it took one.
 */
export function area<I, E>(layer: Layer.Layer<I, E, Resident | NoInfer<I> | Whole>, Screen: ComponentType<Shown<NoInfer<I> | Resident>>, options: { back?: Effect.Effect<boolean, never, NoInfer<I> | Resident> } = {}) {
  const opened = new WeakMap<Alpha, ManagedRuntime.ManagedRuntime<I | Resident, unknown>>();
  function runtime(alpha: Alpha) {
    const known = opened.get(alpha);
    if (known) return known;
    const made = alpha.over(layer);
    opened.set(alpha, made);
    return made;
  }
  return {
    runtime,
    open(alpha: Alpha, place: Place): ComponentType {
      const shown = runtime(alpha);
      const { back } = options;
      if (back) alpha.taking(place, () => shown.runPromise(back));
      return function Opened() {
        return <Screen runtime={shown} alpha={alpha} />;
      };
    },
  };
}
