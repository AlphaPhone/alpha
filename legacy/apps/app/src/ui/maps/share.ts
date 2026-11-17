import {
  type Coordinate,
  coordinate,
  type Route,
} from "@elizaos/plugin-maps/client/contracts";
export type MapShare = { title: string; text: string; url?: string };
const point = (value: Coordinate) => {
  const p = coordinate(value);
  return `${p.latitude}, ${p.longitude}`;
};
export function placeShare(label: string, value: Coordinate): MapShare {
  const p = coordinate(value);
  const url = `https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=17/${p.latitude}/${p.longitude}`;
  return { title: label, text: `${label}\n${point(p)}`, url };
}
export function routeShare(label: string, route: Route): MapShare {
  return {
    title: `Route to ${label}`,
    text: [
      `Route to ${label}`,
      `${route.mode}: ${point(route.from)} → ${point(route.to)}`,
      `${route.distanceMeters} m · ${route.durationSeconds} s`,
      ...route.steps.map((step, index) => `${index + 1}. ${step.instruction}`),
      `Traffic: ${route.traffic}`,
      route.attribution,
    ].join("\n"),
  };
}
