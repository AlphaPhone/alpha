import { area } from "../runtime/area.tsx";
import { stepping } from "../shell/shell.vibe";
import { Machine } from "../../gen/app__workflows__list.effect.vibe";
import { together } from "../runtime/reactor.vibe";
import { Workflows } from "./Workflows.tsx";
import { backHistory, history } from "./history.vibe";
import { Effect } from "effect";
import { backLifecycle, lifecycle } from "./lifecycle.vibe";
import { backRuns, runs } from "./runs.vibe";
import { approvals } from "./approvals.vibe";
import { authoring, backDraft } from "./authoring.vibe";
import { backList, listing } from "./list.vibe";
import { automations, backAutomations } from "./automations.vibe";
import { backClock, clock } from "./clock.vibe";
import { backDigests, digests } from "./digests.vibe";

const mounted = together(listing, history, lifecycle, runs, approvals, authoring, automations, clock, digests, stepping("view:Workflows", Machine, (state) => state.sheet || state.place.tag !== "ListingRows"));

const back = Effect.gen(function* () {
  for (const step of [backClock(), backDigests(), backDraft(), backAutomations(), backRuns(), backLifecycle(), backHistory()]) {
    if (yield* step) return true;
  }
  return yield* backList();
});

/** Workflows, opened over the resident agent the first time the view is drawn. */
export default area(mounted, Workflows, { back });
