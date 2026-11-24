// spec/maps/plane.md, "Story: See the map for what I am looking at"
import { createContext } from "react";

/** Whether a Maps plane here is drawn by MapLibre, which needs WebGL and fetches tiles; stories render the plane undrawn. */
export const MapsDrawn = createContext(true);
