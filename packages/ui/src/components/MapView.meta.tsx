import type { ComponentMeta } from "vibestack/stories";
import type { MapViewProps } from "./MapView.tsx";

export const meta: ComponentMeta<MapViewProps> = {
  args: { label: "Map of Harbour Cafe", tiles: [], markers: [{ key: "1", x: 0, y: 0, label: "Harbour Cafe", chosen: true }] },
  examples: {
    Route: { line: [{ x: -80, y: 60 }, { x: 0, y: 0 }, { x: 40, y: -50 }], markers: [{ key: "here", x: -80, y: 60, label: "Your location", here: true }, { key: "1", x: 40, y: -50, label: "Harbour Cafe", chosen: true }] },
    Results: { markers: [{ key: "1", x: -30, y: 10, label: "Harbour Cafe" }, { key: "2", x: 50, y: -20, label: "Harbour Gallery" }] },
  },
};
