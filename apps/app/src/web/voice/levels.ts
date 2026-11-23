// spec/voice/capture.md, "Levels are drawn only from the open capture, as 44 bars between 4 and 48 units high"
import { Effect, Stream } from "effect";
import { Dictation } from "../../voice/dictation.vibe";
import { runtime } from "./runtime.ts";

/** The latest level bars of the dictation recording, for `useSyncExternalStore`. */
export interface LevelStore {
  readonly get: () => readonly number[];
  readonly subscribe: (notify: () => void) => () => void;
}

const empty: readonly number[] = [];
const listeners = new Set<() => void>();
let bars = empty;
let stop: (() => void) | undefined;

/** The dictation recording's levels in the app runtime: followed only while something shows them. */
export const levelStore: LevelStore = {
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
