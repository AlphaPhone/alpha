import type { ComponentMeta } from "vibestack/stories";
import { homeTiles, idleControls } from "./fixtures.ts";
import type { TileGridProps } from "./TileGrid.tsx";

export const meta: ComponentMeta<TileGridProps> = {
  args: { faces: homeTiles, controls: idleControls, label: "Home apps" },
  examples: { Editing: { editing: true } },
};
