// spec/app/reminders/index.md, "Story: Organize reminders across smart views and custom lists"; spec/app/reminders/editor.md, "Story: Create and edit a reminder safely"
import { Effect, Layer } from "effect";
import * as RemindersMachine from "../../gen/app__reminders.effect.vibe";
import { area } from "../runtime/area.tsx";
import { closeReminderEditor } from "./editor.vibe";
import { Reminders } from "./Reminders.tsx";

const back = Effect.gen(function* () {
  if (yield* closeReminderEditor()) return true;
  const reminders = yield* RemindersMachine.Machine;
  const tried: ReadonlyArray<Effect.Effect<unknown, unknown>> = [
    reminders.send({ type: "closeItem" }),
    reminders.send({ type: "setSearchOpen", open: false }),
    reminders.send({ type: "leaveList" }),
  ];
  for (const step of tried) {
    if (yield* Effect.match(step, { onFailure: () => false, onSuccess: () => true })) return true;
  }
  return false;
});

/** Reminders area entry point: its desk, editor, and due-time alert machines are resident. */
export default area(Layer.empty, Reminders, { back });
