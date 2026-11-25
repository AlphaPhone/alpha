// spec/app/clock/index.md, "Back closes an open sheet before leaving Clock"
import { Effect } from "effect";
import * as ClockView from "../../gen/app__clock.effect.vibe";
import { area } from "../runtime/area.tsx";
import { together } from "../runtime/reactor.vibe";
import { Clock } from "./Clock.tsx";
import { stopwatch } from "./stopwatch.vibe";
import { ensureClockResident } from "./sync.vibe";
import { clockScreenTick } from "./ticker.vibe";

const back = Effect.gen(function* () {
  const view = yield* ClockView.Machine;
  return yield* Effect.match(view.send({ type: "back" }), { onFailure: () => false, onSuccess: () => true });
});

/** Clock, mounted at `view:Clock`: adds the area-scoped stopwatch and live screen ticker to resident Clock machines. */
export default area(together(ensureClockResident, stopwatch, clockScreenTick), Clock, { back });
