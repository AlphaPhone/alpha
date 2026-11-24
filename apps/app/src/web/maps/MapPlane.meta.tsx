import { getWorkerCount, getWorkerUrl } from "maplibre-gl";
import { expect } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { MapPlaneProps } from "./MapPlane.tsx";
import { MapsDrawn } from "./map-drawing.ts";

const noop = () => undefined;

/** How long a worker that loaded is given to report a failure before it counts as started. */
const WORKER_SETTLE_MS = 1500;

/**
 * MapLibre runs one worker, from a script the page really serves: a worker it cannot load leaves every map
 * "unavailable". Where the page cannot start workers at all (the node lane), only the count is checked.
 */
const workerLoads = async () => {
  await expect(getWorkerCount()).toBe(1);
  if (typeof Worker === "undefined") return;
  const url = getWorkerUrl();
  await expect(url).not.toBe("");
  const failure = await new Promise<string | undefined>((resolve) => {
    const worker = new Worker(url, { type: "module" });
    const done = (why?: string) => { worker.terminate(); resolve(why); };
    worker.addEventListener("error", (e) => done(e.message || `MapLibre's worker did not load from ${url}`));
    setTimeout(() => done(), WORKER_SETTLE_MS);
  });
  await expect(failure).toBeUndefined();
};

export const meta: ComponentMeta<MapPlaneProps> = {
  args: {
    basemap: "WorldMap", label: "Map", follow: false, generation: 1,
    onPin: noop, onLongPress: noop, onPressStart: noop, onPressMove: noop, onPressEnd: noop, onInteraction: noop, onSettled: noop, onState: noop,
  },
  examples: {
    Google: { basemap: "GoogleRaster", label: "Google Maps", tileSize: 256, minZoom: 3, maxZoom: 21 },
    OpenData: { basemap: "OpenRaster", label: "OpenStreetMap", tileSize: 512, minZoom: 0, maxZoom: 19 },
  },
  play: { Default: workerLoads },
  decorator: (story) => <MapsDrawn value={false}><div className="h-96 w-full">{story()}</div></MapsDrawn>,
};
