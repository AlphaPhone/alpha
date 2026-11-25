// spec/app/notes/index.md, "Story: See my notes"; spec/app/notes/index.md, "Back in the list closes the proposal on show"; spec/app/notes/editor.md, "Back closes the note; leaving Notes closes it too, lets go of a note on its way to Recently deleted, and an unsaved draft waits"
import { Effect } from "effect";
import * as Editor from "../../gen/app__notes__editor.effect.vibe";
import * as Link from "../../gen/app__notes__linkNote.effect.vibe";
import * as List from "../../gen/app__notes.effect.vibe";
import * as Voice from "../../gen/app__notes__voice.effect.vibe";
import { area } from "../runtime/area.tsx";
import { together } from "../runtime/reactor.vibe";
import { Notes } from "./Notes.tsx";
import { notes } from "./notes.vibe";
import { views } from "./views.vibe";

/** Back inside Notes: the open note, after saving what was typed, then the proposal on show. */
const back = Effect.gen(function* () {
  const editor = yield* Editor.Machine;
  const voice = yield* Voice.Machine;
  const link = yield* Link.Machine;
  const list = yield* List.Machine;
  yield* Effect.ignore(editor.send({ type: "save" }, "Owner"));
  const tried: ReadonlyArray<Effect.Effect<unknown, unknown>> = [
    editor.send({ type: "back" }, "Owner"),
    voice.send({ type: "back" }, "Owner"),
    link.send({ type: "back" }, "Owner"),
    list.send({ type: "back" }, "Owner"),
  ];
  for (const step of tried) if (yield* Effect.match(step, { onFailure: () => false, onSuccess: () => true })) return true;
  return false;
});

/** Notes, at its view (areas.ts): the list read from the agent's store each time Notes comes forward, and the note open over it. */
export default area(together(notes, views), Notes, { back });
