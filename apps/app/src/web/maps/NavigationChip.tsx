// spec/maps/guidance.md, "Story: Guide me along the route I started"
import { MapPin } from "lucide-react";
import { useMachine } from "../../../gen/maps__guidance.react.ts";
import { guidanceDuration } from "../../maps/geometry.vibe";
import { bannerOf } from "../../maps/navigation.vibe";
import type { AppId } from "../app-screen.ts";
import { cn, focusRing } from "../lib/cn.ts";
import { mapsRuntime, useMapsContent } from "./runtime.ts";

export type NavigationChipProps = {
  readonly open: (app: AppId, route?: string) => void;
};

/**
 * The ongoing guidance chip over other apps: time left, or Arrived; a tap returns to Maps.
 * @model spec/maps/guidance.md
 */
export function NavigationChip({ open }: NavigationChipProps) {
  const { state } = useMachine(mapsRuntime);
  const content = useMapsContent();
  const g = content.guidance;
  if (!state || state.phase === "NotGuiding" || !g) return null;
  const label = state.phase === "Arrived" ? "Arrived" : guidanceDuration(bannerOf(g.route, g.marks, state.step, g.fix).remainingSeconds);
  return (
    <button type="button" onClick={() => open("maps")} aria-label={`Navigation, ${label}`}
      className={cn(focusRing, "flex items-center gap-1 rounded-xl bg-primary px-3 py-1 text-sm text-primary-foreground tabular-nums")}>
      <MapPin aria-hidden className="size-4" />{label}
    </button>
  );
}
