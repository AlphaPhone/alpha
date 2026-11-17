import type { Coordinate } from "@elizaos/plugin-maps/client/contracts";

/** A search result or other candidate drawn on the map; tapping reports its id. */
export type MapPin = Readonly<{
  id: string;
  label: string;
  coordinate: Coordinate;
}>;
/** Device position from an explicit location session; heading only while moving. */
export type MapPosition = Readonly<{
  coordinate: Coordinate;
  accuracyMeters: number;
  headingDegrees?: number;
}>;
export type MapOverlay = Readonly<{
  pins?: readonly MapPin[];
  position?: MapPosition | null;
  /** Keep the camera on the position, rotated to its heading (navigation). */
  follow?: boolean;
}>;
