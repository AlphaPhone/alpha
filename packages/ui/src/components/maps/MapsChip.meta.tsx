import { Coffee, House } from "lucide-react";
import type { ComponentMeta } from "vibestack/stories";
import type { MapsChipProps } from "./MapsChip.tsx";

export const meta: ComponentMeta<MapsChipProps> = {
  args: { label: "Home", icon: <House /> },
  examples: { "On a sheet": { label: "Coffee", icon: <Coffee />, tone: "fill" } },
};
