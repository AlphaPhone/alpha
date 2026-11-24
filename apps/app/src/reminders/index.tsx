// spec/app/reminders/index.md, "Story: Organize reminders across smart views and custom lists"; spec/app/reminders/editor.md, "Story: Create or edit a reminder with safe validation and draft recovery"
import { Effect, Layer } from "effect";
import * as RemindersMachine from "../../gen/app__reminders.effect.vibe";
import * as EditorMachine from "../../gen/app__reminders__editor.effect.vibe";
import { area } from "../runtime/area.tsx";
import { Reminders } from "./Reminders.tsx";

const back = Effect.gen(function* () {
  const editor = yield* EditorMachine.Machine;
  const reminders = yield* RemindersMachine.Machine;
  const tried: ReadonlyArray<Effect.Effect<unknown, unknown>> = [
    editor.send({ type: "close" }),
    reminders.send({ type: "closeItem" }),
  ];
  for (const step of tried) {
    if (yield* Effect.match(step, { onFailure: () => false, onSuccess: () => true })) return true;
  }
  return false;
});

/** Reminders area entry point: its desk, editor, and due-time alert machines are resident. */
export default area(Layer.empty, Reminders, { back });
