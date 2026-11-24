// spec/notes/index.md; spec/notes/collection.md, "Story: Read my notes under the account I am signed in as"; spec/notes/editor.md, "Story: Edit a note without losing a word"; spec/notes/trash.md, "Story: Recover a deleted note"; spec/notes/recorder.md, "Story: Record a voice note"
import { Effect, type Stream } from "effect";
import type { ScreenProps } from "../app-screen.ts";
import { useMachine as useCollection } from "../../../gen/notes__collection.react.ts";
import { initial as collectionInitial } from "../../../gen/notes__collection.ts";
import { useMachine as useEditor } from "../../../gen/notes__editor.react.ts";
import { initial as editorInitial } from "../../../gen/notes__editor.ts";
import { useMachine as useRecorder } from "../../../gen/notes__recorder.react.ts";
import { initial as recorderInitial } from "../../../gen/notes__recorder.ts";
import { useMachine as useTrash } from "../../../gen/notes__trash.react.ts";
import { initial as trashInitial } from "../../../gen/notes__trash.ts";
import { useMachine as useSourceDialog } from "../../../gen/notes__webSource.react.ts";
import { initial as sourceDialogInitial } from "../../../gen/notes__webSource.ts";
import { NotesCollection } from "../../notes/collection.vibe";
import { NotesEditor } from "../../notes/editor.vibe";
import { NotesFolders } from "../../notes/folders.vibe";
import { rowOf } from "../../notes/list.vibe";
import { NotesListFilter } from "../../notes/listFilter.vibe";
import { NotesHandoff } from "../../notes/origins.vibe";
import { NotesRecorder } from "../../notes/recorder.vibe";
import { type DocumentReceipt, NotesShare } from "../../notes/share.vibe";
import { NotesTrash } from "../../notes/trash.vibe";
import { Native } from "../../platform/native.vibe";
import { useLayer } from "../shell/useLayer.ts";
import { NotesScreenView } from "./NotesScreenView.tsx";
import { runtime } from "./runtime.ts";
import { call, now, useServiceStream } from "../shell/services.ts";

const snapshots = (collection: NotesCollection.Shape) => collection.snapshots;
const drafts = (editor: NotesEditor.Shape) => editor.drafts;
const keptReviews = (editor: NotesEditor.Shape) => editor.keptReviews;
const trashRows = (trash: NotesTrash.Shape) => trash.rows;
const displays = (recorder: NotesRecorder.Shape) => recorder.display;
const folderLists = (folders: NotesFolders.Shape) => folders.changes;
const agentFilters = (filter: NotesListFilter.Shape) => filter.shown;
const requestedFilters = (handoff: NotesHandoff.Shape) => handoff.filters;
const documentReceipts = (share: NotesShare.Shape): Stream.Stream<DocumentReceipt | undefined> => share.receipts;

/** The Notes screen takes what every app screen takes from the shell: its route and how to close it. */
export type NotesScreenProps = ScreenProps;

/**
 * The Notes app: the canonical list, the editor, Recently deleted, and the recorder.
 * @model spec/notes/collection.md
 */
export function NotesScreen({ onClose }: NotesScreenProps) {
  const collection = useCollection(runtime);
  const editorMachine = useEditor(runtime);
  const trashMachine = useTrash(runtime);
  const recorderMachine = useRecorder(runtime);
  const sourceMachine = useSourceDialog(runtime);
  const owned = useServiceStream("notes.snapshots", Effect.map(Effect.service(NotesCollection), snapshots), undefined);
  const draft = useServiceStream("notes.drafts", Effect.map(Effect.service(NotesEditor), drafts), undefined);
  const kept = useServiceStream("notes.keptReviews", Effect.map(Effect.service(NotesEditor), keptReviews), undefined);
  const deleted = useServiceStream("notes.trashRows", Effect.map(Effect.service(NotesTrash), trashRows), []);
  const display = useServiceStream("notes.displays", Effect.map(Effect.service(NotesRecorder), displays), { durationMs: 0, levels: [], transcript: "", positionMs: 0 });
  const folders = useServiceStream("notes.folderLists", Effect.map(Effect.service(NotesFolders), folderLists), []);
  const agentFilter = useServiceStream("notes.agentFilters", Effect.map(Effect.service(NotesListFilter), agentFilters), undefined);
  const requestedFilter = useServiceStream("notes.requestedFilters", Effect.map(Effect.service(NotesHandoff), requestedFilters), undefined);
  const receipt = useServiceStream("notes.documentReceipts", Effect.map(Effect.service(NotesShare), documentReceipts), undefined);
  const foldersLayer = useLayer("notes-folders");
  const selectionLayer = useLayer("notes-selection", "SheetLayer", false);
  const state = collection.state ?? collectionInitial;
  const earlierNotesAvailable = state.owner > 0 && now(Effect.flatMap(Effect.service(Native), (native) => native.available("AlphaConnection")), false);
  const snapshot = owned?.snapshot;
  return (
    <NotesScreenView onClose={onClose} collection={state} editor={editorMachine.state ?? editorInitial} trash={trashMachine.state ?? trashInitial}
      recorder={recorderMachine.state ?? recorderInitial} sourceDialog={sourceMachine.state ?? sourceDialogInitial}
      rows={snapshot === undefined ? [] : snapshot.notes.map(rowOf)} draft={draft} kept={kept} deleted={deleted} display={display} folders={folders}
      agentFilter={agentFilter} requestedFilter={requestedFilter} receipt={receipt} earlierNotesAvailable={earlierNotesAvailable} now={Date.now()}
      can={{
        openTrash: trashMachine.can({ type: "openTrash" }), askRow: trashMachine.can({ type: "askRow" }), restoreRow: trashMachine.can({ type: "restoreRow", exact: true }),
        askErase: trashMachine.can({ type: "askErase", everything: false }), eraseRows: trashMachine.can({ type: "eraseRows", shared: false }),
        retryDraft: editorMachine.can({ type: "retryDraft", untouched: true }), beginRecording: recorderMachine.can({ type: "beginRecording", viaControl: false }),
      }}
      recorderCan={{
        pause: recorderMachine.can({ type: "pauseRecording" }), resume: recorderMachine.can({ type: "resumeRecording" }), stop: recorderMachine.can({ type: "stopRecording" }),
        finish: recorderMachine.can({ type: "finishRecording" }), discard: recorderMachine.can({ type: "discardRecording" }), askDiscard: recorderMachine.can({ type: "askDiscard" }),
        retry: recorderMachine.can({ type: "beginRecording", viaControl: false }),
      }}
      foldersLayer={foldersLayer} selectionLayer={selectionLayer} call={call} />
  );
}
