// spec/maps/guidance.md, "A fix guides only when usable, and only for the current session"
import { ArrowUp, ArrowUpLeft, ArrowUpRight, CornerUpLeft, CornerUpRight, Flag, MoveUpLeft, MoveUpRight, Navigation, RefreshCw, Undo2, type LucideIcon } from "lucide-react";
import type { Maneuver } from "../../maps/maps.schema.vibe";

const icons: Record<Maneuver, LucideIcon> = {
  depart: Navigation, continue: ArrowUp, "slight-left": ArrowUpLeft, left: CornerUpLeft, "sharp-left": CornerUpLeft,
  "slight-right": ArrowUpRight, right: CornerUpRight, "sharp-right": CornerUpRight, "keep-left": MoveUpLeft, "keep-right": MoveUpRight,
  "u-turn": Undo2, roundabout: RefreshCw, arrive: Flag,
};

const names: Record<Maneuver, string> = {
  depart: "Depart", continue: "Continue", "slight-left": "Slight left", left: "Turn left", "sharp-left": "Sharp left",
  "slight-right": "Slight right", right: "Turn right", "sharp-right": "Sharp right", "keep-left": "Keep left", "keep-right": "Keep right",
  "u-turn": "U-turn", roundabout: "Roundabout", arrive: "Arrive",
};

/** The maneuver to draw and its size. */
export type ManeuverIconProps = {
  /** The provider's maneuver; a step without one continues. */
  maneuver?: Maneuver;
  className?: string;
};

/** The arrow of a turn instruction, named for assistive technology. */
export function ManeuverIcon({ maneuver = "continue", className }: ManeuverIconProps) {
  const Icon = icons[maneuver];
  return <Icon role="img" aria-label={names[maneuver]} className={className} />;
}
