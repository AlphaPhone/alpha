// spec/maps/plane.md, "A plane is rebuilt only when its element or basemap changes, and reports only for its own generation"; spec/maps/plane.md, "A failed tile never fails a plane whose style has loaded, and a cancelled tile fails nothing"; spec/maps/plane.md, "The camera goes to what the owner picked, on every map"; spec/maps/plane.md, "The compass shows only while the map is turned or tilted and guidance is not following, and puts north up"; spec/maps/plane.md, "Only the reply to the latest copyright request, for the view in place, is shown, and a failed one never fails the map"; spec/maps/plane.md, "Google content is drawn only on the Google raster, and other content on the world or open raster"; spec/maps/plane.md, "Story: See the map for what I am looking at"
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibre, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Compass } from "lucide-react";
import { useCallback, useState } from "react";
import type { Basemap } from "../../../gen/maps__plane.ts";
import { cameraAim, compassShown, failsThePlane, northUpAfterGuidance, placeZoom, resultsMaxZoom, routeMaxZoom } from "../../../gen/maps__plane.ts";
import type { Coordinate } from "../../maps/maps.schema.vibe";
import type { PlaneDrawing } from "../../maps/plane.vibe";
import { Button } from "../components/ui/index.ts";
import { tileOf, watch } from "./actions.ts";

const WORLD_STYLE = "https://tiles.openfreemap.org/styles/bright";
const OPENING: { center: [number, number]; zoom: number } = { center: [-98, 39], zoom: 2.6 };
/** How long after a finger went down a context menu is that same press. */
const TOUCH_MENU_MS = 1500;

/** The basemap the plane is built for and the reports it makes; what it draws comes from the Maps plane's drawing. */
export type MapPlaneProps = {
  /** Which map to draw; NoBasemap draws nothing. */
  basemap: Basemap;
  /** Raster tile size the provider serves. */
  tileSize?: number;
  /** The least and greatest zoom the provider serves tiles for. */
  minZoom?: number;
  maxZoom?: number;
  /** Guidance follows the position, so the compass stays hidden. */
  follow: boolean;
  /** Accessible name of the map, such as "Google Maps". */
  label: string;
  onPin: (id: string) => void;
  /** A secondary click or press-and-hold menu: drop a pin at once. */
  onLongPress: (coordinate: Coordinate) => void;
  /** A finger went down; the shell decides whether it is held long enough to drop a pin. */
  onPressStart: (coordinate: Coordinate, x: number, y: number) => void;
  onPressMove: (x: number, y: number) => void;
  onPressEnd: () => void;
  /** The owner moved the map by hand. */
  onInteraction: () => void;
  /** The camera settled: its centre, zoom and size. */
  onSettled: (center: Coordinate, zoom: number, width: number, height: number) => void;
  onState: (generation: number, outcome: "PlaneReady" | "PlaneFailed") => void;
  /** The generation the plane was built under; reports of an older one are refused. */
  generation: number;
};

let protocols = 0;

/**
 * The padding that keeps what the camera shows between the search bar and the open sheets, measured from Maps as it is drawn now
 * (the top controls and the credits row above the sheets), with fixed amounts where Maps draws neither. The two never take more than
 * three quarters of the map's height, so a short landscape screen still has room for what the camera shows.
 */
function selectionPadding(container: HTMLElement): { top: number; bottom: number; left: number; right: number } {
  const bounds = container.getBoundingClientRect();
  const height = bounds.height || container.clientHeight;
  const screen = container.closest("main");
  const top = screen?.querySelector("[data-alpha-maps-top]")?.getBoundingClientRect();
  const sheets = screen?.querySelector("[data-alpha-maps-controls]")?.getBoundingClientRect();
  const above = top ? Math.max(0, top.bottom - bounds.top) + 60 : 100;
  const below = sheets ? Math.max(0, bounds.bottom - sheets.top) + 16 : Math.min(430, height * 0.52 + 30);
  const scale = above + below > height * 0.75 && above + below > 0 ? (height * 0.75) / (above + below) : 1;
  return { top: Math.round(above * scale), bottom: Math.round(below * scale), left: 30, right: 30 };
}

function styleFor(basemap: Basemap, protocol: string, tileSize: number, minZoom: number, maxZoom: number, land: string): string | StyleSpecification {
  if (basemap === "WorldMap") return WORLD_STYLE;
  return {
    version: 8,
    sources: { cloud: { type: "raster", tiles: [`${protocol}://tiles/{z}/{x}/{y}.png`], tileSize, minzoom: minZoom, maxzoom: Math.min(maxZoom, 20) } },
    // Land shows beneath a tile still on its way, not the page behind the map.
    layers: [{ id: "land", type: "background", paint: { "background-color": land } }, { id: "cloud-raster", type: "raster", source: "cloud" }],
  };
}

function lineOf(route: ReadonlyArray<Coordinate> | undefined) {
  return { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: (route ?? []).map((c) => [c.longitude, c.latitude]) } };
}

function dot(className: string, label: string, onClick?: () => void): HTMLElement {
  const element = document.createElement(onClick ? "button" : "span");
  if (element instanceof HTMLButtonElement) element.type = "button";
  element.setAttribute("aria-label", label);
  element.className = className;
  if (onClick) element.addEventListener("click", onClick);
  return element;
}

/** A painter for one MapLibre map: each drawing redraws only the route, pins, position or camera that changed. */
function painter(map: MapLibre, onPin: (id: string) => void): { paint: (d: PlaneDrawing) => void; clear: () => void } {
  const markers: maplibregl.Marker[] = [];
  let here: maplibregl.Marker | undefined;
  let keys = { route: "", pins: "", here: "", selection: "", follow: false };
  const paint = (d: PlaneDrawing) => {
    const route = JSON.stringify(d.route?.length ? [d.route[0], d.route.at(-1), d.route.length] : []);
    const pins = JSON.stringify(d.pins.map((p) => [p.id, p.coordinate.latitude, p.coordinate.longitude]));
    const position = JSON.stringify(d.position ?? null);
    const selection = JSON.stringify(d.selection ?? null);
    const routed = d.route !== undefined && d.route.length >= 2;
    if (route !== keys.route) (map.getSource("route") as GeoJSONSource | undefined)?.setData(lineOf(d.route));
    if (pins !== keys.pins) {
      for (const marker of markers.splice(0)) marker.remove();
      for (const pin of d.pins) {
        const element = dot("size-4 rounded-full border-2 border-background bg-primary", pin.label, () => onPin(pin.id));
        markers.push(new maplibregl.Marker({ element }).setLngLat([pin.coordinate.longitude, pin.coordinate.latitude]).addTo(map));
      }
    }
    if (position !== keys.here) {
      here?.remove();
      here = d.position
        ? new maplibregl.Marker({ element: dot("size-3 rounded-full border-2 border-background bg-primary ring-4 ring-primary/30", "Your location") })
          .setLngLat([d.position.coordinate.longitude, d.position.coordinate.latitude]).addTo(map)
        : undefined;
    }
    const following = d.follow && d.position !== undefined;
    if (northUpAfterGuidance(keys.follow, following)) map.easeTo({ bearing: 0, duration: 350 });
    const aim = cameraAim(following, routed, route !== keys.route, d.selection !== undefined, selection !== keys.selection, pins !== keys.pins, d.pins.length);
    if (aim === "FollowPhone" && d.position && (position !== keys.here || !keys.follow)) {
      map.easeTo({ center: [d.position.coordinate.longitude, d.position.coordinate.latitude], zoom: Math.max(map.getZoom(), 16.5), bearing: d.position.headingDegrees ?? map.getBearing(), duration: 500 });
    } else if (aim === "FitRoute" && d.route) {
      const bounds = d.route.reduce((b, c) => b.extend([c.longitude, c.latitude]), new maplibregl.LngLatBounds());
      map.fitBounds(bounds, { padding: selectionPadding(map.getContainer()), maxZoom: routeMaxZoom, duration: 350 });
    } else if (aim === "CenterOnPlace" && d.selection) {
      const padding = selectionPadding(map.getContainer());
      map.easeTo({ center: [d.selection.longitude, d.selection.latitude], zoom: placeZoom, offset: [0, (padding.top - padding.bottom) / 2], duration: 0 });
    } else if (aim === "FitResults") {
      const bounds = d.pins.reduce((b, p) => b.extend([p.coordinate.longitude, p.coordinate.latitude]), new maplibregl.LngLatBounds());
      map.fitBounds(bounds, { padding: selectionPadding(map.getContainer()), maxZoom: resultsMaxZoom, duration: 350 });
    }
    keys = { route, pins, here: position, selection, follow: following };
  };
  const clear = () => {
    for (const marker of markers.splice(0)) marker.remove();
    here?.remove();
  };
  return { paint, clear };
}

/**
 * The MapLibre plane: one map per element and basemap, tiles fetched through the account-bound Cloud provider, drawn from the plane's drawing as it changes.
 * @model spec/maps/plane.md
 * @design design.md
 */
export function MapPlane(props: MapPlaneProps) {
  const [map, setMap] = useState<MapLibre>();
  const [turn, setTurn] = useState({ bearing: 0, pitch: 0 });
  const { basemap, tileSize = 256, minZoom = 0, maxZoom = 20, generation } = props;

  const mount = useCallback((node: HTMLDivElement | null) => {
    if (!node || basemap === "NoBasemap") return;
    const protocol = `alphamaps${++protocols}`;
    maplibregl.addProtocol(protocol, async (params, abort) => {
      const match = /:\/\/tiles\/(\d{1,2})\/(\d{1,7})\/(\d{1,7})\.png$/.exec(params.url);
      // A tile MapLibre stops asking for is cancelled, and gives its Cloud request back.
      const tile = match ? await tileOf(Number(match[1]), Number(match[2]), Number(match[3]), abort.signal) : undefined;
      if (abort.signal.aborted) throw new DOMException("The map tile is no longer needed.", "AbortError");
      if (!tile) throw new Error("This map tile is unavailable.");
      return { data: tile.bytes.buffer.slice(tile.bytes.byteOffset, tile.bytes.byteOffset + tile.bytes.byteLength) };
    });
    const raster = basemap !== "WorldMap";
    const land = getComputedStyle(node).getPropertyValue("--muted").trim() || "#e5e5e5";
    const instance = new maplibregl.Map({
      container: node, style: styleFor(basemap, protocol, tileSize, minZoom, maxZoom, land), center: OPENING.center,
      zoom: raster ? Math.max(OPENING.zoom, minZoom) : OPENING.zoom,
      ...(raster ? { minZoom, maxZoom: Math.min(maxZoom, 22) } : {}),
      attributionControl: false, cancelPendingTileRequestsWhileZooming: false,
    });
    const drawn = painter(instance, props.onPin);
    let stop: (() => void) | undefined;
    let styleLoaded = false;
    instance.once("style.load", () => { styleLoaded = true; });
    instance.on("load", () => {
      instance.addSource("route", { type: "geojson", data: lineOf([]) });
      instance.addLayer({ id: "route-line", type: "line", source: "route", paint: { "line-width": 6, "line-color": getComputedStyle(node).getPropertyValue("--primary") || "currentColor" } });
      stop = watch((s) => s.plane.drawing, drawn.paint);
      props.onState(generation, "PlaneReady");
    });
    instance.on("error", (e) => {
      const tileError = "tile" in e || "sourceId" in e;
      const cause: unknown = e.error;
      const cancelled = typeof cause === "object" && cause !== null && "name" in cause && cause.name === "AbortError";
      if (failsThePlane(styleLoaded, tileError, cancelled)) props.onState(generation, "PlaneFailed");
    });
    instance.on("movestart", (e) => { if ((e as { originalEvent?: unknown }).originalEvent) props.onInteraction(); });
    instance.on("idle", () => {
      const c = instance.getCenter().wrap();
      props.onSettled({ latitude: c.lat, longitude: c.lng }, instance.getZoom(), node.clientWidth, node.clientHeight);
    });
    // Only one finger held still is a press; a second finger makes it a pinch. The menu Android opens after a held
    // finger is that same press, already timed by the shell, so it drops no second pin.
    let touchedAt = -Infinity;
    instance.on("touchstart", (e) => {
      touchedAt = Date.now();
      if (e.originalEvent.touches.length === 1) props.onPressStart({ latitude: e.lngLat.lat, longitude: e.lngLat.lng }, e.point.x, e.point.y);
      else props.onPressEnd();
    });
    instance.on("touchmove", (e) => props.onPressMove(e.point.x, e.point.y));
    instance.on("touchend", () => props.onPressEnd());
    instance.on("touchcancel", () => props.onPressEnd());
    instance.on("contextmenu", (e) => {
      if (Date.now() - touchedAt < TOUCH_MENU_MS) return;
      props.onLongPress({ latitude: e.lngLat.lat, longitude: e.lngLat.lng });
    });
    const turned = () => setTurn({ bearing: Math.trunc(instance.getBearing()), pitch: Math.trunc(instance.getPitch()) });
    instance.on("rotate", turned);
    instance.on("pitch", turned);
    setMap(instance);
    return () => {
      stop?.();
      drawn.clear();
      instance.remove();
      maplibregl.removeProtocol(protocol);
      setMap(undefined);
    };
  }, [basemap, tileSize, minZoom, maxZoom, generation]);

  const northUp = () => {
    if (!map) return;
    map.easeTo({ bearing: 0, pitch: 0, duration: 300 });
    map.getCanvas().focus({ preventScroll: true });
  };

  if (basemap === "NoBasemap") return <div role="img" aria-label="Google map unavailable" className="size-full bg-muted" />;
  return (
    <div className="relative size-full">
      <div ref={mount} role="application" aria-label={props.label} className="size-full" />
      {compassShown(turn.bearing, turn.pitch, props.follow) && (
        <Button variant="secondary" size="icon" aria-label="Turn map north up" className="absolute right-4 top-24 rounded-full shadow-md" onClick={northUp}>
          <Compass aria-hidden style={{ transform: `rotate(${-turn.bearing}deg)` }} />
        </Button>
      )}
    </div>
  );
}
