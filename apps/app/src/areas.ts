import type { View } from "../gen/app__shell.ts";
import type { Area } from "./runtime/area.tsx";

/** The area each view shows, loaded the first time it does, so that Home ships no area's screen. */
export const areas: Partial<Record<View, () => Promise<{ default: Area }>>> = {
  Notes: () => import("./sample/index.tsx"),
};
