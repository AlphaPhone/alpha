// spec/app/startup/index.md, "Until the connection has resolved, Home shows only the Alpha mark" (the cover that waits on this)
import type { Place } from "../areas.ts";
import { externalStore } from "../runtime/store.ts";

const drawn = externalStore(false);
let fetching: ((place?: Place) => void) | undefined;

/**
 * Home's first complete frame: its tiles read and its day cards' first answer in, so nothing pushes the tiles after
 * it shows. Home tells it once; whatever waits for a finished Home reads it as an external store (the startup cover,
 * as v119 kept Home under its cover until it was whole, 45f6bed30 apps/app/src/main.tsx:357), and boot fetches the
 * screens' chunks once it is drawn, so an app's first open shows the app rather than an empty frame.
 */
export const homeFrame = {
  snapshot: drawn.snapshot,
  subscribe: drawn.subscribe,
  /** Home has drawn its first complete frame. @throws {never} */
  drawn(): void {
    if (!drawn.snapshot()) drawn.set(true);
  },
  /** Fetch the chunk of the screen at `place` now, such as on a press on its tile, or every screen's chunk without one. @throws {never} */
  want(place?: Place): void {
    fetching?.(place);
  },
  /** How boot fetches chunks; the one boot that is running serves it, over a Home not drawn yet. @throws {never} */
  serve(fetch: (place?: Place) => void): () => void {
    fetching = fetch;
    if (drawn.snapshot()) drawn.set(false);
    return () => {
      if (fetching === fetch) fetching = undefined;
    };
  },
};
