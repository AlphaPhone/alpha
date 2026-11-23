import type { ComponentMeta } from "vibestack/stories";
import type { TileGridProps } from "./TileGrid.tsx";
import { homeTiles, idleControls } from "./fixtures.ts";

export const meta: ComponentMeta<TileGridProps> = {
  args: { faces: homeTiles, controls: idleControls },
  examples: { Editing: { editing: true } },
};
