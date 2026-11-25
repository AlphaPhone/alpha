import type { ComponentMeta } from "vibestack/stories";
import { ChevronLeft } from "lucide-react";
import { Button } from "../Button.tsx";
import type { MapsSearchBarProps } from "./MapsSearchBar.tsx";

export const meta: ComponentMeta<MapsSearchBarProps> = {
  args: { lead: "search", "aria-label": "Search Maps", placeholder: "Search", leading: <Button size="icon" variant="ghost" aria-label="Back"><ChevronLeft /></Button> },
  examples: { Typed: { leading: undefined, lead: "back", defaultValue: "coffee", onClear: () => {} } },
};
