// spec/maps/screen.md, "Story: Find a place"; spec/maps/screen.md, "Call is offered only for a dialable number on the build that has Phone, and Copy number only for a place that is not Google's"; spec/maps/screen.md, "A place outside every region the provider covers keeps its coordinates and says so"; spec/maps/screen.md, "Story: Plan directions and choose a route"; spec/maps/guidance.md, "Story: Guide me along the route I started"; spec/maps/plane.md, "Story: See the map for what I am looking at"; spec/maps/eventReturn.md, "Story: Go back to the event whose place I opened"; spec/maps/plane.md, "The credits panel opens from the badge or the information button of a built plane"
import { useState } from "react";
import { useMachine as useGuidance } from "../../../gen/maps__guidance.react.ts";
import { useMachine as useLocator } from "../../../gen/maps__location.react.ts";
import { useMachine as usePlane } from "../../../gen/maps__plane.react.ts";
import { useMachine as useReturn } from "../../../gen/maps__eventReturn.react.ts";
import { useMachine as useSaved } from "../../../gen/maps__savedPlaces.react.ts";
import { initial as screenStart } from "../../../gen/maps__screen.ts";
import { useMachine as useScreen } from "../../../gen/maps__screen.react.ts";
import { buildInfo } from "../shell/services.ts";
import type { ScreenProps } from "../app-screen.ts";
import { MapsScreenView } from "./MapsScreenView.tsx";
import { act, ask, useMapsContent } from "./actions.ts";
import { runtime } from "./runtime.ts";

/**
 * The Maps app: the map, search, the place sheet, directions and guidance.
 * @model spec/maps/screen.md
 * @design design.md
 */
export function MapsScreen({ route, onClose }: ScreenProps) {
  const screen = useScreen(runtime).state ?? screenStart;
  const guidance = useGuidance(runtime).state;
  const plane = usePlane(runtime).state;
  const saved = useSaved(runtime).state?.items ?? [];
  const eventReturn = useReturn(runtime).state;
  const locator = useLocator(runtime).state;
  const c = useMapsContent();
  const [aosp] = useState(() => buildInfo().variant === "aosp");
  return (
    <MapsScreenView route={route} onClose={onClose} screen={screen} guidance={guidance} plane={plane} saved={saved} eventReturn={eventReturn} locator={locator}
      content={c} aosp={aosp} now={Date.now()} act={act} ask={ask} />
  );
}
