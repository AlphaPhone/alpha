// spec/app/maps/index.md, "Story: Navigate"
import { ArrowUp, ArrowUpLeft, ArrowUpRight, CornerUpLeft, CornerUpRight, type LucideIcon, MapPin, RotateCw, Undo2 } from "lucide-react";

/**
 * Each kind of turn's arrow, after v121's guidance (ui/maps/guidance.ts), drawn with lucide's nearest icon:
 * sharp and keep turns share the plain turn's corner, and a u-turn is lucide's Undo2. An arrive step shows the pin.
 */
const turnIcons: Record<string, LucideIcon> = {
  depart: ArrowUp, continue: ArrowUp, "slight-left": ArrowUpLeft, left: CornerUpLeft, "sharp-left": CornerUpLeft, "keep-left": CornerUpLeft,
  "slight-right": ArrowUpRight, right: CornerUpRight, "sharp-right": CornerUpRight, "keep-right": CornerUpRight, "u-turn": Undo2, roundabout: RotateCw, arrive: MapPin,
};

/** The icon for a turn, the straight arrow where the provider names no kind it has one for. */
export const turnIcon = (maneuver: string | undefined): LucideIcon => turnIcons[maneuver ?? "continue"] ?? ArrowUp;

/** A turn's arrow. */
export function TurnArrow({ maneuver, className }: { readonly maneuver: string | undefined; readonly className?: string }) {
  const Icon = turnIcon(maneuver);
  return <Icon aria-hidden className={className} />;
}
