import type { ComponentMeta } from "vibestack/stories";
import type { PhotoGridProps } from "./PhotoGrid.tsx";
import { rows, today } from "./fixtures.ts";

const ignore = () => undefined;

export const meta: ComponentMeta<PhotoGridProps> = {
  args: { rows, selection: [], selecting: false, columns: 4, now: today, onOpen: ignore, onToggle: ignore, onHold: ignore, onDrag: ignore, onPinch: ignore },
  examples: {
    Selecting: { selecting: true, selection: ["m:1", "m:3"] },
    ThreeColumns: { columns: 3 },
    FiveColumns: { columns: 5 },
    Empty: { rows: [] },
  },
  bounds: { columns: [3, 5] },
};
