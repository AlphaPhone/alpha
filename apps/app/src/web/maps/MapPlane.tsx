// spec/maps/plane.md, "A plane is rebuilt only when its element or basemap changes, and reports only for its own generation"; spec/maps/plane.md, "Only the reply to the latest copyright request, for the view in place, is shown, and a failed one never fails the map"; spec/maps/plane.md, "Google content is drawn only on the Google raster, and other content on the world or open raster"
import maplibregl, { type GeoJSONSource, type Map as MapLibre, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useState } from "react";
import type { Basemap } from "../../../gen/maps__plane.ts";
import type { Coordinate } from "../../maps/maps.schema.vibe";
import { ask } from "./runtime.ts";

const WORLD_STYLE = "https://tiles.openfreemap.org/styles/bright";
const OPENING: { center: [number, number]; zoom: number } = { center: [-98, 39], zoom: 2.6 };

/** A place drawn on the map; tapping it reports its id. */
export type MapPin = { readonly id: string; readonly label: string; readonly coordinate: Coordinate };

export type MapPlaneProps = {
  /** Which map to draw; NoBasemap draws nothing. */
  basemap: Basemap;
  /** Raster tile size the provider serves. */
  tileSize?: number;
  maxZoom?: number;
  pins: ReadonlyArray<MapPin>;
  /** The place the screen shows, kept in view. */
  selection?: Coordinate;
  /** The phone's position and heading while known. */
  position?: { coordinate: Coordinate; accuracyMeters: number; headingDegrees?: number };
  route?: ReadonlyArray<Coordinate>;
  /** Keep the camera on the position, rotated to its heading. */
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

function styleFor(basemap: Basemap, protocol: string, tileSize: number, maxZoom: number): string | StyleSpecification {
  if (basemap === "WorldMap") return WORLD_STYLE;
  return {
    version: 8,
    sources: { cloud: { type: "raster", tiles: [`${protocol}://tiles/{z}/{x}/{y}.png`], tileSize, maxzoom: Math.min(maxZoom, 20) } },
    layers: [{ id: "cloud-raster", type: "raster", source: "cloud" }],
  };
}

function lineOf(route: ReadonlyArray<Coordinate> | undefined) {
  return { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: (route ?? []).map((c) => [c.longitude, c.latitude]) } };
}

/**
 * The MapLibre plane: one map per element and basemap, tiles fetched through the account-bound Cloud provider.
 * @model spec/maps/plane.md
 * @design design.md
 */
export function MapPlane(props: MapPlaneProps) {
  const [map, setMap] = useState<MapLibre>();
  const { basemap, tileSize = 256, maxZoom = 20, generation } = props;

  const mount = useCallback((node: HTMLDivElement | null) => {
    if (!node || basemap === "NoBasemap") return;
    const protocol = `alphamaps${++protocols}`;
    maplibregl.addProtocol(protocol, async (params) => {
      const match = /:\/\/tiles\/(\d{1,2})\/(\d{1,7})\/(\d{1,7})\.png$/.exec(params.url);
      const tile = match ? await ask((s) => s.plane.tile(Number(match[1]), Number(match[2]), Number(match[3]))) : undefined;
      if (!tile) throw new Error("This map tile is unavailable.");
      return { data: tile.bytes.buffer.slice(tile.bytes.byteOffset, tile.bytes.byteOffset + tile.bytes.byteLength) };
    });
    const instance = new maplibregl.Map({
      container: node, style: styleFor(basemap, protocol, tileSize, maxZoom), center: OPENING.center, zoom: OPENING.zoom,
      attributionControl: false, cancelPendingTileRequestsWhileZooming: false,
    });
    instance.on("load", () => {
      instance.addSource("route", { type: "geojson", data: lineOf([]) });
      instance.addLayer({ id: "route-line", type: "line", source: "route", paint: { "line-width": 6, "line-color": getComputedStyle(node).getPropertyValue("--primary") || "currentColor" } });
      props.onState(generation, "PlaneReady");
    });
    instance.on("error", () => { if (!instance.loaded()) props.onState(generation, "PlaneFailed"); });
    instance.on("movestart", (e) => { if ((e as { originalEvent?: unknown }).originalEvent) props.onInteraction(); });
    instance.on("idle", () => {
      const c = instance.getCenter().wrap();
      props.onSettled({ latitude: c.lat, longitude: c.lng }, instance.getZoom(), node.clientWidth, node.clientHeight);
    });
    instance.on("touchstart", (e) => props.onPressStart({ latitude: e.lngLat.lat, longitude: e.lngLat.lng }, e.point.x, e.point.y));
    instance.on("touchmove", (e) => props.onPressMove(e.point.x, e.point.y));
    instance.on("touchend", () => props.onPressEnd());
    instance.on("touchcancel", () => props.onPressEnd());
    instance.on("contextmenu", (e) => props.onLongPress({ latitude: e.lngLat.lat, longitude: e.lngLat.lng }));
    setMap(instance);
    return () => {
      instance.remove();
      maplibregl.removeProtocol(protocol);
      setMap(undefined);
    };
  }, [basemap, tileSize, maxZoom, generation]);

  const markers = useState<maplibregl.Marker[]>([])[0];
  const routeKey = JSON.stringify(props.route?.length ? [props.route[0], props.route.at(-1), props.route.length] : []);
  const pinKey = JSON.stringify(props.pins.map((p) => p.id));
  const viewKey = JSON.stringify([props.selection, props.follow, props.follow ? props.position : undefined]);

  const syncRoute = useCallback((node: HTMLSpanElement | null) => {
    if (!node || !map) return;
    const source = map.getSource("route") as GeoJSONSource | undefined;
    source?.setData(lineOf(props.route));
    if (props.route && props.route.length >= 2 && !props.follow) {
      const bounds = props.route.reduce((b, c) => b.extend([c.longitude, c.latitude]), new maplibregl.LngLatBounds());
      map.fitBounds(bounds, { padding: { top: 220, bottom: 280, left: 30, right: 30 }, maxZoom: 14, duration: 350 });
    }
  }, [map, routeKey]);

  const syncPins = useCallback((node: HTMLSpanElement | null) => {
    if (!node || !map) return;
    for (const marker of markers.splice(0)) marker.remove();
    for (const pin of props.pins) {
      const element = document.createElement("button");
      element.type = "button";
      element.setAttribute("aria-label", pin.label);
      element.className = "size-4 rounded-full border-2 border-background bg-primary";
      element.addEventListener("click", () => props.onPin(pin.id));
      markers.push(new maplibregl.Marker({ element }).setLngLat([pin.coordinate.longitude, pin.coordinate.latitude]).addTo(map));
    }
    if (props.pins.length > 1 && !props.selection && !props.route && basemap === "WorldMap") {
      const bounds = props.pins.reduce((b, p) => b.extend([p.coordinate.longitude, p.coordinate.latitude]), new maplibregl.LngLatBounds());
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 350 });
    }
  }, [map, pinKey]);

  const syncCamera = useCallback((node: HTMLSpanElement | null) => {
    if (!node || !map) return;
    if (props.follow && props.position) {
      map.easeTo({ center: [props.position.coordinate.longitude, props.position.coordinate.latitude], zoom: Math.max(map.getZoom(), 16.5), bearing: props.position.headingDegrees ?? map.getBearing(), duration: 500 });
    } else if (props.selection && !props.route) {
      map.easeTo({ center: [props.selection.longitude, props.selection.latitude], zoom: basemap === "WorldMap" ? 14 : map.getZoom(), bearing: 0, duration: 0 });
    }
  }, [map, viewKey]);

  if (basemap === "NoBasemap") return <div role="img" aria-label="Google map unavailable" className="size-full bg-muted" />;
  return (
    <div className="relative size-full">
      <div ref={mount} role="application" aria-label={props.label} className="size-full" />
      <span ref={syncRoute} hidden />
      <span ref={syncPins} hidden />
      <span ref={syncCamera} hidden />
    </div>
  );
}
