// spec/voice/capture.md, "Levels are drawn only from the open capture, as 44 bars between 4 and 48 units high"
import { Effect, Stream } from "effect";
import { Dictation } from "../../voice/dictation.vibe";
import type { VoiceRuntime } from "./runtime.tsx";

/** The latest level bars of the dictation recording, for `useSyncExternalStore`. */
export interface LevelStore {
  readonly get: () => readonly number[];
  readonly subscribe: (notify: () => void) => () => void;
}

const empty: readonly number[] = [];
const stores = new WeakMap<VoiceRuntime, LevelStore>();

/** The level store of `runtime`: it follows the recording's levels only while something shows them. */
export function levelStore(runtime: VoiceRuntime): LevelStore {
  const known = stores.get(runtime);
  if (known) return known;
  let bars = empty;
  const listeners = new Set<() => void>();
  let stop: (() => void) | undefined;
  const store: LevelStore = {
    get: () => bars,
    subscribe: (notify) => {
      listeners.add(notify);
      if (!stop) {
        const fiber = runtime.runFork(Effect.flatMap(Effect.service(Dictation), (d) => Stream.runForEach(d.levels(), (next) => Effect.sync(() => {
          bars = next;
          for (const listener of listeners) listener();
        }))));
        stop = () => fiber.interruptUnsafe();
      }
      return () => {
        listeners.delete(notify);
        if (!listeners.size) {
          stop?.();
          stop = undefined;
          bars = empty;
        }
      };
    },
  };
  stores.set(runtime, store);
  return store;
}
