// spec/notes/index.md; spec/notes/editor.md, "Story: Leave a note the way Back does"; spec/notes/recorder.md, "Another owner or leaving Notes detaches the view and keeps the recording"
import { Effect } from "effect";
import { NotebookText } from "lucide-react";
import { NotesEditor } from "../../notes/editor.vibe";
import { NotesRecorder } from "../../notes/recorder.vibe";
import { NotesSources } from "../../notes/sources.vibe";
import { NotesTrash } from "../../notes/trash.vibe";
import type { AppScreen, AppSurface } from "../app-screen.ts";
import { NotesRecordingIndicator } from "./NotesRecordingIndicator.tsx";
import { NotesScreen } from "./NotesScreen.tsx";
import { ask } from "../shell/services.ts";

/** Notes' Back, topmost first: the web source dialog, the recorder sheet, an erase or restore review, Recently deleted, then the open note, saved before it closes. */
export const notesBack = (): Promise<boolean> => ask(Effect.gen(function* () {
  if (yield* (yield* NotesSources).closeDialog()) return true;
  const recorder = yield* NotesRecorder;
  if ((yield* recorder.keep()) || (yield* recorder.leave())) return true;
  const trash = yield* NotesTrash;
  if ((yield* trash.cancelErase()) || (yield* trash.closeAsk()) || (yield* trash.close())) return true;
  const editor = yield* NotesEditor;
  if ((yield* editor.draft()) === undefined) return false;
  yield* editor.leave();
  return true;
}), false);

/** The Notes app, with its own Back before the shell's. */
export const screens: AppScreen[] = [{ id: "notes", title: "Notes", icon: NotebookText, availability: "everywhere", Screen: NotesScreen, back: notesBack }];

/** The recording indicator above every screen. */
export const surfaces: AppSurface[] = [
  { id: "notes-recording", slot: "top", availability: "everywhere", Surface: NotesRecordingIndicator },
];
