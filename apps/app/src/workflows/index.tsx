import { area } from "../runtime/area.tsx";
import { Machine } from "../../gen/app__workflows__list.effect.vibe";
import { Machine as DigestSchedules } from "../../gen/app__digests__schedules.effect.vibe";
import { Machine as ClockState } from "../../gen/app__workflows__clock.effect.vibe";
import { Machine as Layers } from "../../gen/app__shell__layers.effect.vibe";
import { Workflows } from "./Workflows.tsx";
import { backHistory, history } from "./history.vibe";
import { Effect, Stream } from "effect";
import { backLifecycle, lifecycle } from "./lifecycle.vibe";
import { backRuns, runs } from "./runs.vibe";
import { approvals } from "./approvals.vibe";
import { authoring, backDraft } from "./authoring.vibe";
import { backList } from "./list.vibe";
import { applying, contained, started, together } from "../runtime/reactor.vibe";
import { automations, backAutomations } from "./automations.vibe";
import { backClock, clock } from "./clock.vibe";
import { backDigests, digests } from "./digests.vibe";
import { mediaReview } from "../assistant/media-review.vibe";
import { NativeDigestPanel } from "./native-digests.vibe";

const clockNotice = applying(ClockState, (state) => state.open,
  (blocked) => Effect.flatMap(NativeDigestPanel, (view) => view.deferNotice("Clock", blocked)));
const scheduleNotice = applying(DigestSchedules,
  (state) => state.open && (state.editing || state.review.showing || state.runReview.showing || state.change.live || state.runNow.live),
  (blocked) => Effect.flatMap(NativeDigestPanel, (view) => view.deferNotice("Schedule", blocked)));
const steppingWorkflows = started(Effect.gen(function* () {
  const listing = yield* Machine;
  const alarms = yield* ClockState;
  const layers = yield* Layers;
  let offered = false;
  yield* Stream.runForEach(Stream.zipLatest(listing.changes, alarms.changes), ([state, alarm]) => Effect.gen(function* () {
    const has = state.sheet || state.place.tag !== "ListingRows" || alarm.open;
    if (has === offered) return;
    if (yield* contained(layers.send({ type: has ? "offerStep" : "withdrawStep", place: "view:Workflows" }), "offering Back")) offered = has;
  }));
}), "offering Back");
const mounted = together(history, lifecycle, runs, approvals, authoring, automations, clock, digests, mediaReview, clockNotice, scheduleNotice, steppingWorkflows);

const back = Effect.gen(function* () {
  for (const step of [backClock(), backDigests(), backDraft(), backAutomations(), backRuns(), backLifecycle(), backHistory()]) {
    if (yield* step) return true;
  }
  return yield* backList();
});

/** Workflows, opened over the resident agent the first time the view is drawn. */
export default area(mounted, Workflows, { back });
