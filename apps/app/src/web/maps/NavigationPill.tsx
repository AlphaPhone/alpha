// spec/maps/guidance.md, "Story: Guide me along the route I started"
import { MapPin } from "lucide-react";
import { cn, focusRing } from "../lib/cn.ts";

/** What the ongoing guidance chip says and how a tap returns to Maps. */
export type NavigationPillProps = {
  /** The time left, or "Arrived". */
  readonly label: string;
  readonly onOpen: () => void;
};

/**
 * The guidance chip over other apps: the time left or Arrived; a tap returns to Maps.
 * @model spec/maps/guidance.md
 * @design design.md
 */
export function NavigationPill({ label, onOpen }: NavigationPillProps) {
  return (
    <button type="button" onClick={onOpen} aria-label={`Navigation, ${label}`}
      className={cn(focusRing, "flex items-center gap-1 rounded-xl bg-primary px-3 py-1 text-sm text-primary-foreground tabular-nums")}>
      <MapPin aria-hidden className="size-4" />{label}
    </button>
  );
}
