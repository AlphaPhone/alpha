// spec/workflows/index.md; spec/workflows/place.md, "Story: Move inside Workflows and come back with Back"
import { Effect } from "effect";
import { type PlaceSheet, WorkflowsPlace } from "../../workflows/place.vibe";
import { ask, useServiceStream } from "../shell/services.ts";

const nothingOpen: PlaceSheet = { phoneSources: [], renewing: undefined, impact: undefined, removalGrant: undefined, step: undefined };

/** What the open Workflows sheets show: the saved phone sources, the Google removal list and the selected run's phone step. */
export function usePlaceSheet(): PlaceSheet {
  return useServiceStream("workflows.sheets", WorkflowsPlace.use((place) => Effect.succeed(place.sheets)), nothingOpen);
}

/** Android's Back while Workflows is in front: true when Workflows closed a sheet or review or returned to its list. */
export function back(): Promise<boolean> {
  return ask(WorkflowsPlace.use((place) => place.back()), false);
}
