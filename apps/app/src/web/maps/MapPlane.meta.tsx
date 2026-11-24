import type { ComponentMeta } from "vibestack/stories";
import type { MapPlaneProps } from "./MapPlane.tsx";
import { MapsDrawn } from "./map-drawing.ts";

const noop = () => undefined;

export const meta: ComponentMeta<MapPlaneProps> = {
  args: {
    basemap: "WorldMap", label: "Map", follow: false, generation: 1,
    onPin: noop, onLongPress: noop, onPressStart: noop, onPressMove: noop, onPressEnd: noop, onInteraction: noop, onSettled: noop, onState: noop,
  },
  examples: {
    Google: { basemap: "GoogleRaster", label: "Google Maps", tileSize: 256, minZoom: 3, maxZoom: 21 },
    OpenData: { basemap: "OpenRaster", label: "OpenStreetMap", tileSize: 512, minZoom: 0, maxZoom: 19 },
  },
  decorator: (story) => <MapsDrawn value={false}><div className="h-96 w-full">{story()}</div></MapsDrawn>,
};
