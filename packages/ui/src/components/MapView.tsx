import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibre, StyleSpecification } from "maplibre-gl";
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { Compass, Minus, Plus } from "lucide-react";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { cn } from "../lib/cn.ts";
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
  | { kind: "centre"; key: string; at: MapPoint; zoom: number }
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

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

const hexByte = (value: number) => value.toString(16).padStart(2, "0");

function resolveCssColor(node: HTMLElement, token: string): string {
  const raw = getComputedStyle(node).getPropertyValue(token).trim();
  if (!raw || typeof document === "undefined") return raw || "currentColor";
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return raw;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = raw;
  ctx.fillRect(0, 0, 1, 1);
  const data = ctx.getImageData(0, 0, 1, 1).data;
  if (!data[3]) return raw;
  return `#${hexByte(data[0] ?? 0)}${hexByte(data[1] ?? 0)}${hexByte(data[2] ?? 0)}`;
}

const pinDotClass = (chosen: boolean) =>
  `block rounded-full border-2 border-background shadow-sm ${chosen ? "size-5 bg-destructive" : "size-4 bg-primary"}`;

function pinElement(pin: MapPin, onClick: () => void): { button: HTMLButtonElement; dot: HTMLSpanElement } {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", pin.label);
  button.className = "flex size-11 items-center justify-center rounded-full focus-visible:outline-solid focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-ring";
  const dot = document.createElement("span");
  dot.setAttribute("aria-hidden", "true");
  dot.className = pinDotClass(pin.chosen === true);
  button.append(dot);
  button.addEventListener("click", onClick);
  return { button, dot };
}

function dot(className: string, label: string): HTMLElement {
  const element = document.createElement("span");
  element.setAttribute("aria-label", label);
  element.className = className;
  return element;
}

interface PinEntry {
  marker: maplibregl.Marker;
  button: HTMLButtonElement;
  dot: HTMLSpanElement;
  chosen: boolean;
  lat: number;
  lng: number;
  label: string;
}

interface Painted {
  readonly markers: Map<string, PinEntry>;
  here: maplibregl.Marker | undefined;
  pins: string;
  spot: string;
  route: string;
  camera: string;
}

/** Bring `map` to what `props` shows: only the pins, position, route or camera that changed. */
function paint(map: MapLibre, painted: Painted, props: MapViewProps, onPin: (key: string) => void): void {
  const pins = JSON.stringify(props.pins.map((pin) => [pin.key, pin.at, pin.label, pin.chosen === true]));
  if (pins !== painted.pins) {
    const keep = new Set(props.pins.map((pin) => pin.key));
    for (const [key, entry] of painted.markers) {
      if (!keep.has(key)) {
        entry.marker.remove();
        painted.markers.delete(key);
      }
    }
    for (const pin of props.pins) {
      const chosen = pin.chosen === true;
      const existing = painted.markers.get(pin.key);
      if (existing) {
        if (existing.lat !== pin.at.lat || existing.lng !== pin.at.lng) {
          existing.marker.setLngLat([pin.at.lng, pin.at.lat]);
          existing.lat = pin.at.lat;
          existing.lng = pin.at.lng;
        }
        if (existing.label !== pin.label) {
          existing.button.setAttribute("aria-label", pin.label);
          existing.label = pin.label;
        }
        if (existing.chosen !== chosen) {
          existing.dot.className = pinDotClass(chosen);
          existing.chosen = chosen;
        }
      } else {
        const { button, dot: dotEl } = pinElement(pin, () => onPin(pin.key));
        const marker = new maplibregl.Marker({ element: button }).setLngLat([pin.at.lng, pin.at.lat]).addTo(map);
        painted.markers.set(pin.key, { marker, button, dot: dotEl, chosen, lat: pin.at.lat, lng: pin.at.lng, label: pin.label });
      }
    }
    painted.pins = pins;
  }
  const spot = JSON.stringify(props.here ?? null);
  if (spot !== painted.spot) {
    painted.here?.remove();
    painted.here = props.here === undefined ? undefined
      : new maplibregl.Marker({ element: dot("size-3 rounded-full border-2 border-background bg-primary ring-4 ring-primary/30", "Your location") })
        .setLngLat([props.here.lng, props.here.lat]).addTo(map);
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
  const motion = (ms: number) => (reducedMotion() ? 0 : ms);
  if (camera.kind === "follow") map.easeTo({ center: [camera.at.lng, camera.at.lat], zoom: Math.max(map.getZoom(), 16.5), duration: motion(500) });
  else if (camera.kind === "centre") map.easeTo({ center: [camera.at.lng, camera.at.lat], zoom: camera.zoom, duration: 0 });
  else if (camera.kind === "northUp") map.easeTo({ bearing: 0, pitch: 0, duration: motion(350) });
  else if (camera.points.length > 0) {
    const bounds = camera.points.reduce((b, p) => b.extend([p.lng, p.lat]), new maplibregl.LngLatBounds());
    map.fitBounds(bounds, { padding: 48, maxZoom: camera.maxZoom, duration: motion(350) });
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
  const { label, surface, style, drawn = true, zoomControls = true, children, className } = props;
  const latestRef = useRef(props);
  const [map, setMap] = useState<MapLibre>();
  const [turn, setTurn] = useState({ bearing: 0, pitch: 0 });
  const paintedRef = useRef<Painted>({ markers: new Map(), here: undefined, pins: "", spot: "", route: "", camera: "" });
  const styleKey = style.kind === "raster" ? `${style.tileSize}/${style.minZoom}/${style.maxZoom}` : style.url;

  const mount = useCallback((node: HTMLDivElement | null) => {
    if (!node || !drawn) return;
    const protocol = `alphamap${++protocols}`;
    const chosen = latestRef.current.style;
    if (chosen.kind === "raster") {
      maplibregl.addProtocol(protocol, async (params, abort) => {
        const address = /:\/\/tiles\/(\d{1,2})\/(\d{1,7})\/(\d{1,7})$/.exec(params.url);
        if (!address) throw new Error("This is not a map tile.");
        const current = latestRef.current.style;
        if (current.kind !== "raster") throw new Error("Map style changed.");
        const bytes = await current.tile(Number(address[1]), Number(address[2]), Number(address[3]), abort.signal);
        if (abort.signal.aborted) throw new DOMException("The map tile is no longer needed.", "AbortError");
        return { data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer };
      });
    }
    let instance: MapLibre;
    let styleLoaded = false;
    try {
      maplibregl.setWorkerUrl(mapWorkerUrl);
      instance = new maplibregl.Map({
        container: node, style: styleOf(chosen, protocol), center: [0, 20], zoom: 1.5, attributionControl: false,
        ...(chosen.kind === "raster" ? { minZoom: chosen.minZoom, maxZoom: chosen.maxZoom } : {}),
      });
    } catch {
      if (chosen.kind === "raster") maplibregl.removeProtocol(protocol);
      latestRef.current.onTrouble(surface, { styleLoaded: false, tileError: false, cancelled: false });
      return;
    }
    const pin = (key: string) => latestRef.current.onPin(key);
    let themeObserver: MutationObserver | undefined;
    instance.once("style.load", () => { styleLoaded = true; });
    instance.on("load", () => {
      instance.addSource("route", { type: "geojson", data: lineOf([]) });
      instance.addLayer({ id: "route-line", type: "line", source: "route", paint: { "line-width": 6, "line-color": resolveCssColor(node, "--primary") } });
      if (typeof MutationObserver !== "undefined") {
        themeObserver = new MutationObserver(() => {
          if (instance.getLayer("route-line")) instance.setPaintProperty("route-line", "line-color", resolveCssColor(node, "--primary"));
        });
        themeObserver.observe(node.ownerDocument.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
      }
      paintedRef.current = { markers: new Map(), here: undefined, pins: "", spot: "", route: "", camera: "" };
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
    window.addEventListener("mouseup", end);
    instance.on("dragstart", () => latestRef.current.onDragged?.());
    instance.on("moveend", () => {
      const bounds = instance.getBounds();
      latestRef.current.onSettled({ north: bounds.getNorth(), south: bounds.getSouth(), east: bounds.getEast(), west: bounds.getWest(), zoom: Math.round(instance.getZoom()) });
    });
    const turned = () => {
      const bearing = Math.trunc(instance.getBearing());
      const pitch = Math.trunc(instance.getPitch());
      setTurn((prev) => (prev.bearing === bearing && prev.pitch === pitch ? prev : { bearing, pitch }));
    };
    instance.on("rotate", turned);
    instance.on("pitch", turned);
    return () => {
      window.removeEventListener("mouseup", end);
      themeObserver?.disconnect();
      for (const entry of paintedRef.current.markers.values()) entry.marker.remove();
      paintedRef.current.markers.clear();
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
    map?.easeTo({ bearing: 0, pitch: 0, duration: reducedMotion() ? 0 : 300 });
    map?.getCanvas().focus({ preventScroll: true });
  };

  return (
    <div className={cn("relative h-72 w-full overflow-hidden rounded-lg bg-muted", className)}>
      <span ref={repaint} hidden />
      <div key={styleKey} ref={mount} role="application" aria-label={label} data-alpha-own-gesture="" className="size-full" />
      {map && (
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
          {zoomControls && <Button size="icon" variant="outline" aria-label="Zoom in" onClick={() => map.zoomIn(reducedMotion() ? { duration: 0 } : undefined)}><Plus aria-hidden /></Button>}
          {zoomControls && <Button size="icon" variant="outline" aria-label="Zoom out" onClick={() => map.zoomOut(reducedMotion() ? { duration: 0 } : undefined)}><Minus aria-hidden /></Button>}
          {props.compass(turn.bearing, turn.pitch) && (
            <Button size="icon" variant="outline" aria-label="Turn map north up" onClick={northUp}>
              <Compass aria-hidden style={{ transform: `rotate(${-turn.bearing}deg)` }} />
            </Button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
