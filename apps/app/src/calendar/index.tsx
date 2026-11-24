// spec/app/calendar/index.md, "The layout menu and the month dialog open over the days, never over an open event"; spec/app/calendar/index.md, "Back closes the event"; spec/app/calendar/editor.md, "Closing a form with edits kept on the phone sets it aside, offered back by a banner; otherwise the form is gone"
import { Effect, Layer } from "effect";
import * as View from "../../gen/app__calendar.effect.vibe";
import * as Editor from "../../gen/app__calendar__editor.effect.vibe";
import { area } from "../runtime/area.tsx";
import { together } from "../runtime/reactor.vibe";
import { changes } from "./agent.vibe";
import { Calendar } from "./Calendar.tsx";
import { calendar } from "./calendar.vibe";
import { deletions } from "./deletions.vibe";
import { editor } from "./editor.vibe";
import { syncing } from "./sync.vibe";

/** Back inside Calendar: the form, then the overlay, then the open event, while one is open. */
const back = Effect.gen(function* () {
  const form = yield* Editor.Machine;
  const view = yield* View.Machine;
  const tried: ReadonlyArray<Effect.Effect<unknown, unknown>> = [
    form.send({ type: "close" }),
    view.send({ type: "closeOverlay" }),
    view.send({ type: "closeEvent" }),
  ];
  for (const step of tried) if (yield* Effect.match(step, { onFailure: () => false, onSuccess: () => true })) return true;
  return false;
});

/** Calendar, at its view (areas.ts): its view, its form, sync and the agent's changes live from its first opening until Alpha closes. */
export default area(Layer.mergeAll(together(calendar, editor, syncing, deletions), changes), Calendar, { back });
