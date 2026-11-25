import { Car } from "lucide-react";
import type { ComponentMeta } from "vibestack/stories";
import type { MapsPillButtonProps } from "./MapsPillButton.tsx";

export const meta: ComponentMeta<MapsPillButtonProps> = {
  args: { children: <><Car aria-hidden />Directions</> },
  examples: { Empty: { "aria-label": "Directions", children: <Car aria-hidden /> } },
};
