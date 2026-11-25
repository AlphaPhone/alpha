import type { ComponentMeta } from "vibestack/stories";
import type { MapsSearchBarProps } from "./MapsSearchBar.tsx";

export const meta: ComponentMeta<MapsSearchBarProps> = {
  args: { lead: "search", "aria-label": "Search Maps", placeholder: "Search" },
  examples: { Typed: { lead: "back", defaultValue: "coffee", onClear: () => {} } },
};
