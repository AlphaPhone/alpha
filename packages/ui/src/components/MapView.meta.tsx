import type { ComponentMeta } from "vibestack/stories";
import type { MapViewProps } from "./MapView.tsx";

const harbour = { lat: 43.7312, lng: 7.4211 };

export const meta: ComponentMeta<MapViewProps> = {
  args: {
    label: "Map of Harbour Cafe",
    surface: 1,
    drawn: false,
    style: { kind: "vector", url: "https://tiles.openfreemap.org/styles/bright" },
    pins: [{ key: "1", at: harbour, label: "Harbour Cafe", chosen: true }],
    camera: { kind: "centre", key: "1", at: harbour, zoom: 14 },
    compass: () => false,
    onReady: () => undefined,
    onTrouble: () => undefined,
    onPin: () => undefined,
    onPress: () => undefined,
    onPressMove: () => undefined,
    onPressEnd: () => undefined,
    onSettled: () => undefined,
  },
  examples: {
    Route: {
      here: { lat: 43.73, lng: 7.42 },
      line: [{ lat: 43.73, lng: 7.42 }, harbour],
      camera: { kind: "fit", key: "route", points: [{ lat: 43.73, lng: 7.42 }, harbour], maxZoom: 17 },
    },
    Results: {
      pins: [{ key: "1", at: harbour, label: "Harbour Cafe" }, { key: "2", at: { lat: 43.7333, lng: 7.4167 }, label: "Harbour Gallery" }],
      camera: { kind: "fit", key: "results", points: [harbour, { lat: 43.7333, lng: 7.4167 }], maxZoom: 14 },
    },
  },
};
