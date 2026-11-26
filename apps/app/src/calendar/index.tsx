// spec/app/calendar/index.md, "Back closes one layer at a time: the form, the delete review, the event, then the overlay"; spec/app/calendar/agent.md, "Back, a hidden page or leaving Calendar retires a card still waiting; the request stays the agent's"; spec/app/calendar/editor.md, "Closing a form with edits kept on the phone sets it aside, offered back by a banner; otherwise the form is gone"; spec/app/calendar/deletions.md, "Delete asks first, over the open event: what goes, from which calendar, when, which occurrences, and that no guest is told"
import { reviewedReadsMachine } from "@elizaos/plugin-calendar-client";
import { Effect, Layer } from "effect";
import * as Actions from "../../gen/app__calendar__actions.effect.vibe";
import * as View from "../../gen/app__calendar.effect.vibe";
import { backCloses } from "../../gen/app__calendar.ts";
import * as Held from "../../gen/app__calendar__deletions.effect.vibe";
import * as Editor from "../../gen/app__calendar__editor.effect.vibe";
import * as Changes from "../../gen/app__calendar__agent.effect.vibe";
import * as Reopen from "../../gen/app__calendar__reminderReopen.effect.vibe";
import { area } from "../runtime/area.tsx";
import { together } from "../runtime/reactor.vibe";
import { changes } from "./agent.vibe";
import { Calendar } from "./Calendar.tsx";
import { calendar } from "./calendar.vibe";
import { deletions } from "./deletions.vibe";
import { editor } from "./editor.vibe";
import { linking } from "./link.vibe";
import { owners } from "./owner.vibe";
import { reopening } from "./reopen.vibe";
import { selecting } from "./subject.vibe";

/** Back inside Calendar: any reopen review first, then the layer on top as the view orders them; with none, a card still waiting is retired. */
const back = Effect.gen(function* () {
  const dismiss = yield* Reopen.Machine;
  const review = yield* dismiss.get();
  if (review.showing) {
    if (Reopen.canCancel(review)) yield* Effect.ignore(dismiss.send({ type: "cancel" }));
    return true;
  }
  const form = yield* Editor.Machine;
  const view = yield* View.Machine;
  const agent = yield* Changes.Machine;
  const layer = backCloses(yield* view.get());
  const step: Effect.Effect<unknown, unknown> =
    layer === "BackForm" ? Effect.catch(form.send({ type: "callOff" }), () => form.send({ type: "close" }))
    : layer === "BackReview" ? (yield* Held.Machine).send({ type: "keepEvent" })
    : layer === "BackEvent" ? view.send({ type: "closeEvent" })
    : layer === "BackReminder" ? view.send({ type: "closeReminder" })
    : layer === "BackOverlay" ? view.send({ type: "closeOverlay" })
    : Effect.catch(form.send({ type: "callOff" }), () => agent.send({ type: "retire" }, "Owner"));
  return yield* Effect.match(step, { onFailure: () => layer === "BackForm", onSuccess: () => true });
});

/** Calendar, at its view (areas.ts): its view, its form, the Google link, who it reads for and the agent's changes live from its first opening until Alpha closes. */
export default area(Layer.mergeAll(together(calendar, editor, linking, deletions, owners, reopening, selecting), changes, Actions.machine(), reviewedReadsMachine()), Calendar, { back });
