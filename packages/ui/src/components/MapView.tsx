import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.ts";

/** A map tile's image, placed in pixels from the centre of the view. */
export interface MapTile {
  key: string;
  url: string;
  left: number;
  top: number;
}

/** A marker of the map, placed in pixels from the centre of the view. */
export interface MapMarker {
  key: string;
  x: number;
  y: number;
  /** What the marker stands for, read by assistive technology. */
  label: string;
  /** Where the phone is, drawn as a dot; any other marker is a pin. */
  here?: boolean;
  chosen?: boolean;
}

export type MapViewProps = Omit<ComponentProps<"div">, "children"> & {
  /** What the map shows, for assistive technology. */
  label: string;
  tiles: readonly MapTile[];
  markers: readonly MapMarker[];
  /** The route, as points in pixels from the centre of the view. */
  line?: readonly { x: number; y: number }[];
  /** What sits over the map: its credits and its controls. */
  children?: ReactNode;
};

/** A map: tiles under markers and a route, centred on what it shows. Draws what it is given and decides nothing. */
export function MapView({ label, tiles, markers, line, className, children, ...props }: MapViewProps) {
  const path = line && line.length > 1 ? line.map((p, at) => `${at === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ") : undefined;
  return (
    <div role="img" aria-label={label} className={cn("relative h-72 w-full overflow-hidden rounded-lg bg-muted", className)} {...props}>
      <div className="absolute top-1/2 left-1/2">
        {tiles.map((tile) => (
          <img key={tile.key} src={tile.url} alt="" width={256} height={256} className="absolute max-w-none select-none" style={{ left: tile.left, top: tile.top }} />
        ))}
        {path ? (
          <svg aria-hidden className="absolute overflow-visible" width={1} height={1}>
            <path d={path} className="fill-none stroke-primary" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
        {markers.map((marker) => (
          <span
            key={marker.key}
            role="presentation"
            title={marker.label}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background",
              marker.here ? "size-4 bg-primary" : marker.chosen ? "size-5 bg-destructive" : "size-3.5 bg-foreground",
            )}
            style={{ left: marker.x, top: marker.y }}
          />
        ))}
      </div>
      {children}
    </div>
  );
}
