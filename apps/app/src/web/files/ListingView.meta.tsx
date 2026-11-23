import type { ComponentMeta } from "vibestack/stories";
import type { ListingViewProps } from "./ListingView.tsx";
import { empty, folder, partial, selecting } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<ListingViewProps> = {
  args: { browser: folder, volumeName: "Internal storage", canSelect: true, onOpen: none, onToggle: none, onGroup: none, onCrumb: none, onSort: none, onGrid: none, onBeginSelecting: none },
  examples: { Selecting: { browser: selecting }, Partial: { browser: partial }, Empty: { browser: empty }, Grid: { browser: { ...folder, grid: true } } },
};
