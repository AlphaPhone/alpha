import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibre, StyleSpecification } from "maplibre-gl";
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { Minus, Plus } from "lucide-react";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { cn, focusRing } from "../lib/cn.ts";
import { Button } from "./Button.tsx";

/** A point of the map in degrees. */
export interface MapPoint {
  lat: number;
  lng: number;
}

/** A pin of the map: a place it shows. */
export interface MapPin {
  key: string;
  at: MapPoint;
  /** What the pin stands for, read by assistive technology and as its button's name. */
  label: string;
  chosen?: boolean;
}

/** Where the camera goes, named by `key`: a camera is applied once, when its key is new. */
export type MapCamera =
  | { kind: "keep" }
  | { kind: "follow"; key: string; at: MapPoint }
  | { kind: "centre"; key: string; at: MapPoint; zoom: number; lift?: number }
  | { kind: "fit"; key: string; points: readonly MapPoint[]; maxZoom: number }
  | { kind: "northUp"; key: string };

/** What the map draws: a vector style by its address, or the provider's raster tiles, fetched by `tile`. */
export type MapStyle =
  | { kind: "vector"; url: string }
  | {
      kind: "raster";
      tileSize: 256 | 512;
      minZoom: number;
      maxZoom: number;
      tile: (z: number, x: number, y: number, signal: AbortSignal) => Promise<Uint8Array>;
    };

/** A view of the map: its bounds in degrees and its whole zoom. */
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
}

/** What went wrong while drawing: whether the style had loaded, whether it was a tile's error, and whether it was a cancelled request. */
export interface MapTrouble {
  styleLoaded: boolean;
  tileError: boolean;
  cancelled: boolean;
}

export interface MapViewProps {
  /** What the map shows, for assistive technology. */
  label: string;
  /** The surface drawn: a new number builds a new map. */
  surface: number;
  style: MapStyle;
  pins: readonly MapPin[];
  /** Where the phone is. */
  here?: MapPoint;
  /** The route, as points of the map. */
  line?: readonly MapPoint[];
  camera: MapCamera;
  /** Whether the compass shows for the map's bearing and pitch, in whole degrees. */
  compass: (bearing: number, pitch: number) => boolean;
  /** Whether MapLibre draws the map, which needs WebGL and the network; stories show the frame alone. */
  drawn?: boolean;
  /** Whether to show zoom buttons alongside the compass. */
  zoomControls?: boolean;
  /** Where the camera first stands, before any `camera` moves it; the whole world from above Africa unless given. */
  opening?: { at: MapPoint; zoom: number };
  /** How far the compass stands from the foot of the map, in pixels, when it stands over the map's corner rather than with the zoom buttons. */
  compassBottom?: number;
  onReady: (surface: number) => void;
  onTrouble: (surface: number, trouble: MapTrouble) => void;
  onPin: (key: string) => void;
  /** One finger, or the primary button, went down on the map, here. */
  onPress: (at: MapPoint) => void;
  /** The press moved this many pixels from where it went down. */
  onPressMove: (pixels: number) => void;
  /** The press ended: lifted, a second finger, or the menu that follows a held finger. */
  onPressEnd: () => void;
  /** The camera came to rest on this view. */
  onSettled: (view: MapBounds) => void;
  /** The owner began to drag the map. */
  onDragged?: () => void;
  /** What sits over the map: its credits and its controls. */
  children?: ReactNode;
  className?: string;
}

let protocols = 0;

function styleOf(style: MapStyle, protocol: string): string | StyleSpecification {
  if (style.kind === "vector") return style.url;
  return {
    version: 8,
    sources: { cloud: { type: "raster", tiles: [`${protocol}://tiles/{z}/{x}/{y}`], tileSize: style.tileSize, minzoom: style.minZoom, maxzoom: style.maxZoom } },
    layers: [{ id: "cloud-raster", type: "raster", source: "cloud" }],
  };
}

const lineOf = (points: readonly MapPoint[] | undefined) => ({
  type: "Feature" as const,
  properties: {},
  geometry: { type: "LineString" as const, coordinates: (points ?? []).map((p) => [p.lng, p.lat]) },
});

function dot(className: string, label: string, onClick?: () => void): HTMLElement {
  const element = document.createElement(onClick ? "button" : "span");
  if (element instanceof HTMLButtonElement) element.type = "button";
  element.setAttribute("aria-label", label);
  element.className = className;
  if (onClick) element.addEventListener("click", onClick);
  return element;
}

/** The map accent, `--map`, read from the page: MapLibre's marker and route line take a color, not a class. */
const mapAccent = (node: HTMLElement) => getComputedStyle(node).getPropertyValue("--map").trim() || "currentColor";

/** Where the phone is: a dot in the map accent ringed in white, the same in both themes. */
function puck(): HTMLElement {
  const element = document.createElement("span");
  element.setAttribute("role", "img");
  element.setAttribute("aria-label", "Your location");
  element.className = "pointer-events-none relative block size-7";
  const spot = document.createElement("span");
  spot.className = "absolute top-1.25 left-1.25 size-4.5 rounded-full border-3 border-alpha-foreground bg-map shadow-sm";
  element.append(spot);
  return element;
}

interface Painted {
  readonly markers: maplibregl.Marker[];
  here: maplibregl.Marker | undefined;
  pins: string;
  spot: string;
  route: string;
  camera: string;
}

/** Bring `map` to what `props` shows: only the pins, position, route or camera that changed. */
function paint(map: MapLibre, painted: Painted, props: MapViewProps, onPin: (key: string) => void): void {
  const pins = JSON.stringify(props.pins.map((pin) => [pin.key, pin.at, pin.chosen === true]));
  if (pins !== painted.pins) {
    for (const marker of painted.markers.splice(0)) marker.remove();
    const accent = mapAccent(map.getContainer());
    for (const pin of props.pins) {
      const marker = pin.chosen
        ? new maplibregl.Marker({ color: accent })
        : new maplibregl.Marker({ element: dot("size-5.5 cursor-pointer rounded-full border-3 border-map bg-alpha-foreground p-0 shadow-sm", pin.label, () => onPin(pin.key)) });
      if (pin.chosen) {
        marker.getElement().setAttribute("role", "img");
        marker.getElement().setAttribute("aria-label", pin.label);
      }
      painted.markers.push(marker.setLngLat([pin.at.lng, pin.at.lat]).addTo(map));
    }
    painted.pins = pins;
  }
  const spot = JSON.stringify(props.here ?? null);
  if (spot !== painted.spot) {
    painted.here?.remove();
    painted.here = props.here === undefined ? undefined
      : new maplibregl.Marker({ element: puck() }).setLngLat([props.here.lng, props.here.lat]).addTo(map);
    painted.spot = spot;
  }
  const route = JSON.stringify(props.line ?? []);
  if (route !== painted.route) {
    void map.getSource<GeoJSONSource>("route")?.setData(lineOf(props.line));
    painted.route = route;
  }
  const camera = props.camera;
  if (camera.kind === "keep" || camera.key === painted.camera) return;
  painted.camera = camera.key;
  if (camera.kind === "follow") map.easeTo({ center: [camera.at.lng, camera.at.lat], zoom: Math.max(map.getZoom(), 16.5), duration: 500 });
  else if (camera.kind === "centre") map.easeTo({ center: [camera.at.lng, camera.at.lat], zoom: camera.zoom, offset: [0, -(camera.lift ?? 0)], duration: 0 });
  else if (camera.kind === "northUp") map.easeTo({ bearing: 0, pitch: 0, duration: 350 });
  else if (camera.points.length > 0) {
    const bounds = camera.points.reduce((b, p) => b.extend([p.lng, p.lat]), new maplibregl.LngLatBounds());
    map.fitBounds(bounds, { padding: 48, maxZoom: camera.maxZoom, duration: 350 });
  }
}

/** The pixels between two points of the screen. */
const apart = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.round(Math.hypot(a.x - b.x, a.y - b.y));

/**
 * A map drawn by MapLibre: a vector style or the provider's raster tiles, each tile fetched by `style.tile` and cancelled
 * once out of view, at the provider's tile size, so a high-density screen draws sharp tiles. It pans, pinches, turns and
 * tilts; it shows pins, the phone and a route, goes where `camera` says once per key, and reports its presses. It decides
 * nothing: whether a trouble breaks the map, whether the compass shows and what a press does are its owner's.
 */
export function MapView(props: MapViewProps) {
  const { label, surface, style, drawn = true, zoomControls = true, compassBottom, children, className } = props;
  const latestRef = useRef(props);
  const [map, setMap] = useState<MapLibre>();
  const [turn, setTurn] = useState({ bearing: 0, pitch: 0 });
  const paintedRef = useRef<Painted>({ markers: [], here: undefined, pins: "", spot: "", route: "", camera: "" });
  const styleKey = style.kind === "raster" ? `${style.tileSize}/${style.minZoom}/${style.maxZoom}` : style.url;

  const mount = useCallback((node: HTMLDivElement | null) => {
    if (!node || !drawn) return;
    const protocol = `alphamap${++protocols}`;
    const chosen = latestRef.current.style;
    const opening = latestRef.current.opening;
    if (chosen.kind === "raster") {
      maplibregl.addProtocol(protocol, async (params, abort) => {
        const address = /:\/\/tiles\/(\d{1,2})\/(\d{1,7})\/(\d{1,7})$/.exec(params.url);
        if (!address) throw new Error("This is not a map tile.");
        const bytes = await chosen.tile(Number(address[1]), Number(address[2]), Number(address[3]), abort.signal);
        if (abort.signal.aborted) throw new DOMException("The map tile is no longer needed.", "AbortError");
        return { data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer };
      });
    }
    let instance: MapLibre;
    let styleLoaded = false;
    try {
      maplibregl.setWorkerUrl(mapWorkerUrl);
      instance = new maplibregl.Map({
        container: node, style: styleOf(chosen, protocol), attributionControl: false,
        center: opening === undefined ? [0, 20] : [opening.at.lng, opening.at.lat], zoom: opening?.zoom ?? 1.5,
        ...(chosen.kind === "raster" ? { minZoom: chosen.minZoom, maxZoom: chosen.maxZoom } : {}),
      });
    } catch {
      if (chosen.kind === "raster") maplibregl.removeProtocol(protocol);
      latestRef.current.onTrouble(surface, { styleLoaded: false, tileError: false, cancelled: false });
      return;
    }
    const pin = (key: string) => latestRef.current.onPin(key);
    instance.once("style.load", () => { styleLoaded = true; });
    instance.on("load", () => {
      instance.addSource("route", { type: "geojson", data: lineOf([]) });
      instance.addLayer({ id: "route-line", type: "line", source: "route", paint: { "line-width": 6, "line-color": mapAccent(node) } });
      paintedRef.current = { markers: [], here: undefined, pins: "", spot: "", route: "", camera: "" };
      paint(instance, paintedRef.current, latestRef.current, pin);
      setMap(instance);
      latestRef.current.onReady(surface);
    });
    instance.on("error", (event) => {
      const cause: unknown = event.error;
      latestRef.current.onTrouble(surface, {
        styleLoaded,
        tileError: "tile" in event || "sourceId" in event,
        cancelled: typeof cause === "object" && cause !== null && "name" in cause && cause.name === "AbortError",
      });
    });
    let down: { x: number; y: number } | undefined;
    const press = (at: maplibregl.LngLat, point: { x: number; y: number }) => {
      down = point;
      latestRef.current.onPress({ lat: at.lat, lng: at.lng });
    };
    const end = () => {
      if (down === undefined) return;
      down = undefined;
      latestRef.current.onPressEnd();
    };
    const moved = (point: { x: number; y: number }) => {
      if (down !== undefined) latestRef.current.onPressMove(apart(down, point));
    };
    instance.on("touchstart", (event) => (event.originalEvent.touches.length === 1 ? press(event.lngLat, event.point) : end()));
    instance.on("touchmove", (event) => moved(event.point));
    instance.on("touchend", end);
    instance.on("touchcancel", end);
    instance.on("mousedown", (event) => { if (event.originalEvent.button === 0) press(event.lngLat, event.point); });
    instance.on("mousemove", (event) => moved(event.point));
    instance.on("mouseup", end);
    instance.on("contextmenu", end);
    instance.on("dragstart", () => latestRef.current.onDragged?.());
    instance.on("moveend", () => {
      const bounds = instance.getBounds();
      latestRef.current.onSettled({ north: bounds.getNorth(), south: bounds.getSouth(), east: bounds.getEast(), west: bounds.getWest(), zoom: Math.round(instance.getZoom()) });
    });
    const turned = () => setTurn({ bearing: Math.trunc(instance.getBearing()), pitch: Math.trunc(instance.getPitch()) });
    instance.on("rotate", turned);
    instance.on("pitch", turned);
    return () => {
      for (const marker of paintedRef.current.markers.splice(0)) marker.remove();
      paintedRef.current.here?.remove();
      instance.remove();
      if (chosen.kind === "raster") maplibregl.removeProtocol(protocol);
      setMap(undefined);
    };
  }, [drawn, surface]);

  const repaint = (node: HTMLSpanElement | null) => {
    latestRef.current = props;
    if (node && map) paint(map, paintedRef.current, props, (key) => latestRef.current.onPin(key));
  };

  const northUp = () => {
    map?.easeTo({ bearing: 0, pitch: 0, duration: 300 });
    map?.getCanvas().focus({ preventScroll: true });
  };

  const compass = map && props.compass(turn.bearing, turn.pitch) && (
    <button type="button" aria-label="Turn map north up" onClick={northUp}
      className={cn(focusRing, "flex size-12 items-center justify-center rounded-full bg-background text-foreground shadow-float ring-1 ring-border active:bg-accent dark:shadow-float-dark")}>
      <svg aria-hidden viewBox="0 0 24 24" className="size-5.5 fill-none stroke-current stroke-2" style={{ transform: `rotate(${-turn.bearing}deg)` }}><path d="M12 3l6 18-6-4-6 4z" strokeLinejoin="round" /></svg>
    </button>
  );

  return (
    <div className={cn("relative h-72 w-full overflow-hidden rounded-lg bg-muted", className)}>
      <span ref={repaint} hidden />
      <div key={styleKey} ref={mount} role="application" aria-label={label} data-alpha-own-gesture="" className="size-full" />
      {map && zoomControls && (
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <Button size="icon" variant="outline" aria-label="Zoom in" onClick={() => map.zoomIn()}><Plus /></Button>
          <Button size="icon" variant="outline" aria-label="Zoom out" onClick={() => map.zoomOut()}><Minus /></Button>
          {compassBottom === undefined && compass}
        </div>
      )}
      {map && (!zoomControls || compassBottom !== undefined) && compass && (
        <div className="absolute right-4.5 z-10" style={{ bottom: compassBottom === undefined ? undefined : `min(${compassBottom}px, calc(100% - 116px))`, top: compassBottom === undefined ? 8 : undefined }}>{compass}</div>
      )}
      {children}
    </div>
  );
}
