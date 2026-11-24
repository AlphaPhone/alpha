// spec/maps/guidance.md, "Story: Guide me along the route I started"
import { useMachine } from "../../../gen/maps__guidance.react.ts";
import { guidanceDuration } from "../../maps/geometry.vibe";
import { bannerOf } from "../../maps/navigation.vibe";
import type { AppId } from "../app-screen.ts";
import { useMapsContent } from "./actions.ts";
import { NavigationPill } from "./NavigationPill.tsx";
import { runtime } from "./runtime.ts";

/** How the chip brings Maps back to the front. */
export type NavigationChipProps = {
  readonly open: (app: AppId, route?: string) => void;
};

/**
 * The ongoing guidance chip over other apps, shown while guidance runs: time left, or Arrived; a tap returns to Maps.
 * @model spec/maps/guidance.md
 */
export function NavigationChip({ open }: NavigationChipProps) {
  const { state } = useMachine(runtime);
  const content = useMapsContent();
  const g = content.guidance;
  if (!state || state.phase === "NotGuiding" || !g) return null;
  const label = state.phase === "Arrived" ? "Arrived" : guidanceDuration(bannerOf(g.route, g.marks, state.step, g.fix).remainingSeconds);
  return <NavigationPill label={label} onOpen={() => open("maps")} />;
}
