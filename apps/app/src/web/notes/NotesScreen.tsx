// spec/notes/collection.md, "Story: Read my notes under the account I am signed in as"; spec/notes/editor.md, "Story: Edit a note without losing a word"; spec/notes/list.md, "Story: Narrow the list to what I am looking for"; spec/notes/trash.md, "Story: Recover a deleted note"; spec/notes/recorder.md, "Story: Record a voice note"; spec/notes/share.md, "Story: Share the note I have open"; spec/notes/share.md, "One document operation runs at a time, and its receipt shows only in its own visible visit"; spec/notes/trash.md, "A restore needs the exact deletion and the current revision, and a delete's Undo the exact deletion"
import { Effect, type Stream } from "effect";
import { Ellipsis, Folder, Mic, Plus, Search, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { ScreenProps } from "../app-screen.ts";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input, Sheet, SheetContent, Toast, ToastProvider, ToastViewport } from "../components/ui/index.ts";
import { useMachine as useCollection } from "../../../gen/notes__collection.react.ts";
import { initial as collectionInitial, statusLabel } from "../../../gen/notes__collection.ts";
import { useMachine as useEditor } from "../../../gen/notes__editor.react.ts";
import { copyDraftAllowed, dirty, initial as editorInitial } from "../../../gen/notes__editor.ts";
import { useMachine as useRecorder } from "../../../gen/notes__recorder.react.ts";
import { initial as recorderInitial } from "../../../gen/notes__recorder.ts";
import { useMachine as useTrash } from "../../../gen/notes__trash.react.ts";
import { initial as trashInitial } from "../../../gen/notes__trash.ts";
import { useMachine as useSourceDialog } from "../../../gen/notes__webSource.react.ts";
import { initial as sourceDialogInitial } from "../../../gen/notes__webSource.ts";
import { NotesAudio } from "../../notes/audio.vibe";
import { NotesCollection } from "../../notes/collection.vibe";
import { NotesEditor } from "../../notes/editor.vibe";
import { NotesFolders } from "../../notes/folders.vibe";
import { filterRows, matchesText, rowOf, shownRows, type NotesFilter } from "../../notes/list.vibe";
import { NotesListFilter } from "../../notes/listFilter.vibe";
import { NotesHandoff, NotesOrigins } from "../../notes/origins.vibe";
import { NotesRecorder } from "../../notes/recorder.vibe";
import { type DocumentReceipt, NotesShare, type ShareChannel } from "../../notes/share.vibe";
import { NotesSources } from "../../notes/sources.vibe";
import { NotesTrash, type TrashNotice, type TrashRow } from "../../notes/trash.vibe";
import { copyText } from "../../notes/platform.ts";
import { Native } from "../../platform/native.vibe";
import { draftCopyText } from "../../notes/share.vibe";
import { testMocksBuilt } from "../../platform/build-flags.ts";
import { useLayer } from "../shell/useLayer.ts";
import { FoldersSheet } from "./FoldersSheet.tsx";
import { shareNoticeText, statusText, trashNoticeText } from "./messages.ts";
import { NoteEditor } from "./NoteEditor.tsx";
import { NoteRecorder } from "./NoteRecorder.tsx";
import { NotesList } from "./NotesList.tsx";
import { PreviousDeviceNotes } from "./PreviousDeviceNotes.tsx";
import { NotesReviewBar } from "./NotesReviewBar.tsx";
import { NotesTrash as TrashView } from "./NotesTrash.tsx";
import { runtime } from "./runtime.ts";
import { call, now, useServiceStream } from "../shell/services.ts";
import { WebSourceDialog } from "./WebSourceDialog.tsx";

const snapshots = (collection: NotesCollection.Shape) => collection.snapshots;
const drafts = (editor: NotesEditor.Shape) => editor.drafts;
const keptReviews = (editor: NotesEditor.Shape) => editor.keptReviews;
const trashRows = (trash: NotesTrash.Shape) => trash.rows;
const displays = (recorder: NotesRecorder.Shape) => recorder.display;
const folderLists = (folders: NotesFolders.Shape) => folders.changes;
const agentFilters = (filter: NotesListFilter.Shape) => filter.shown;
const requestedFilters = (handoff: NotesHandoff.Shape) => handoff.filters;
const documentReceipts = (share: NotesShare.Shape): Stream.Stream<DocumentReceipt | undefined> => share.receipts;

const kindNames: Record<NonNullable<NotesFilter["kind"]>, string> = { text: "Notes", list: "Checklists", voice: "Voice notes", link: "Links" };

/** The chip text of an active filter, such as “term sheet” · Voice notes · Work. */
function filterLabel(filter: NotesFilter, folderName: (id: string) => string | undefined): string {
  return [filter.text ? `“${filter.text}”` : "", filter.kind ? kindNames[filter.kind] : "", filter.folder ? folderName(filter.folder) ?? "" : ""].filter(Boolean).join(" · ") || "All notes";
}

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
  const [seenReceipt, setSeenReceipt] = useState<DocumentReceipt>();
  const [previousOwner, setPreviousOwner] = useState<number>();
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [folder, setFolder] = useState<string>();
  const foldersLayer = useLayer("notes-folders");
  const [asked, setAsked] = useState<TrashRow>();
  const [transcribing, setTranscribing] = useState(false);
  const [notice, setNotice] = useState<{ text: string; action?: { label: string; onAction: () => void }; onDismiss?: () => void }>();

  const state = collection.state ?? collectionInitial;
  const earlierNotesAvailable = state.owner > 0 && now(Effect.flatMap(Effect.service(Native), (native) => native.available("AlphaConnection")), false);
  useEffect(() => {
    if (!earlierNotesAvailable || previousOwner !== state.owner) setPreviousOwner(undefined);
  }, [earlierNotesAvailable, previousOwner, state.owner]);
  const editor = editorMachine.state ?? editorInitial;
  const trash = trashMachine.state ?? trashInitial;
  const recorder = recorderMachine.state ?? recorderInitial;
  const sourceDialog = sourceMachine.state ?? sourceDialogInitial;
  const snapshot = owned?.snapshot;
  const rows = snapshot === undefined ? [] : snapshot.notes.map(rowOf);
  const folderIds = new Set(folders.map((item) => item.id));
  const filter = agentFilter ?? requestedFilter ?? (folder === undefined ? undefined : { folder });
  const shown = shownRows(filterRows(rows, filter, folderIds).filter((row) => matchesText(row, search)));
  const openRow = editor.draftId === "" ? undefined : rows.find((row) => row.id === editor.draftId);
  const status = statusText[statusLabel(dirty(editor), state)];
  const tell = (text: string, action?: { label: string; onAction: () => void }, onDismiss?: () => void) => {
    if (text !== "") setNotice({ text, ...(action === undefined ? {} : { action }), ...(onDismiss === undefined ? {} : { onDismiss }) });
  };
  const tellTrash = (said: TrashNotice) =>
    tell(trashNoticeText[said], undefined, () => void call(NotesTrash, (service) => service.noticeShown()));

  const leave = () => void call(NotesEditor, (service) => service.leave());
  const openNote = (id: string) => void call(NotesEditor, (service) => service.leave(id));
  const edit = (patch: Parameters<NotesEditor.Shape["edit"]>[0]) => void call(NotesEditor, (service) => Effect.andThen(service.edit(patch), service.save()));
  const remove = () => {
    const id = editor.draftId;
    void call(NotesEditor, (service) => service.remove(id)).then((outcome) => {
      if (!outcome.deleted || outcome.deletedAt === undefined) return;
      const deletedAt = outcome.deletedAt;
      void call(NotesTrash, (service) => service.deleted());
      tell("Deleted", { label: "Undo", onAction: () => void call(NotesTrash, (service) => service.undo(id, deletedAt)).then(tellTrash) },
        () => void call(NotesTrash, (service) => service.dismissUndo()));
    });
  };
  const share = (channel: ShareChannel) => {
    const id = editor.draftId;
    void call(NotesShare, (service) => service.snapshotOf(id)).then((snapshotText) => snapshotText === undefined
      ? tell(shareNoticeText.changed)
      : call(NotesShare, (service) => service.share(id, snapshotText, channel)).then((said) => { if (channel !== "save" || said === "busy" || said === "changed") tell(shareNoticeText[said]); }));
  };
  const schedule = (kind: "event" | "reminder") => {
    const id = editor.draftId;
    void call(NotesEditor, (service) => service.leave(id)).then(() => call(NotesOrigins, (service) => service.scheduleDraft(id, kind))).then((said) => tell(
      said === "ready" ? "Check time" : said === "empty" ? "This note has no open items or text to schedule."
        : said === "too-long" ? (kind === "event" ? "Shorten this note before creating an event. Nothing was added to your calendar." : "Shorten this note before creating a reminder. Nothing scheduled.")
        : "This note cannot be linked."));
  };

  let body: ReactNode;
  if (trash.opened) {
    body = (
      <TrashView view={trash} rows={deleted} {...(asked === undefined ? {} : { asked })}
        canAsk={trashMachine.can({ type: "askRow" })} canRestore={trashMachine.can({ type: "restoreRow", exact: true })}
        canAskErase={trashMachine.can({ type: "askErase", everything: false })} canErase={trashMachine.can({ type: "eraseRows", shared: false })}
        onClose={() => void call(NotesTrash, (service) => service.close())}
        onAsk={(row) => { setAsked(row); void call(NotesTrash, (service) => service.ask(row)); }}
        onCloseAsk={() => void call(NotesTrash, (service) => service.closeAsk())}
        onRestore={(row) => void call(NotesTrash, (service) => service.restore(row)).then(tellTrash)}
        onAskErase={(all) => void call(NotesTrash, (service) => service.askErase(all))}
        onCancelErase={() => void call(NotesTrash, (service) => service.cancelErase())}
        onErase={() => void call(NotesTrash, (service) => service.erase(asked)).then(tellTrash)} />
    );
  } else if (draft !== undefined && editor.present) {
    body = (
      <NoteEditor draft={draft} {...(openRow === undefined ? {} : { row: openRow })} status={status} saved={openRow !== undefined}
        playing={openRow?.audio !== undefined && display.playingAudioId === openRow.audio.audioId} positionMs={display.positionMs} transcribing={transcribing}
        onEdit={edit} onBack={leave} onDelete={remove} onShare={share} onSchedule={schedule}
        onPlay={() => { if (openRow) void call(NotesRecorder, (service) => service.play(openRow)).then((ok) => { if (!ok) tell("No audio"); }); }}
        onStopPlayback={() => void call(NotesRecorder, (service) => service.stopPlayback())}
        onTranscribe={() => {
          if (!openRow) return;
          setTranscribing(true);
          void call(NotesAudio, (service) => service.transcribe(openRow)).then((said) => {
            setTranscribing(false);
            tell(said === "saved" ? "" : said === "no-speech" ? "No speech was found. Your recording is kept."
              : said === "cancelled" ? "Transcript cancelled. Your recording is kept." : said === "unavailable" ? "Recording unavailable" : "Not saved");
          });
        }}
        onCancelTranscript={() => void call(NotesAudio, (service) => service.cancel())}
        onWebSource={() => void call(NotesSources, (service) => service.openDialog(editor.draftId))}
        onAttachment={() => { if (openRow) void call(NotesSources, (service) => service.openAttachment(openRow)).then((said) => tell(said === "mismatch" ? "That file doesn’t match this attachment." : said === "opened" ? "" : "Couldn’t open the linked file.")); }} />
    );
  } else {
    body = (
      <>
        <header className="flex items-center gap-2 px-4 pt-4">
          <h1 className="flex-1 font-display text-3xl">Notes</h1>
          <Button variant="ghost" size="icon" aria-label="Search notes" onClick={() => setSearching(!searching)}><Search aria-hidden /></Button>
          <Button variant="ghost" size="icon" aria-label="Folders" onClick={() => { foldersLayer.show(); void call(NotesFolders, (service) => service.list()); }}><Folder aria-hidden /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Notes options"><Ellipsis aria-hidden /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={!trashMachine.can({ type: "openTrash" })} onSelect={() => void call(NotesTrash, (service) => service.open())}>Recently deleted</DropdownMenuItem>
              {testMocksBuilt && <DropdownMenuItem onSelect={() => void call(NotesShare, (service) => service.importText()).then((said) => { if (said === "busy" || said === "unavailable") tell(shareNoticeText[said]); })}>Import text file</DropdownMenuItem>}
              {earlierNotesAvailable && <DropdownMenuItem onSelect={() => setPreviousOwner(state.owner)}>Previous notes</DropdownMenuItem>}
              <DropdownMenuItem onSelect={onClose}>Close Notes</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        {searching && <div className="px-4 py-2"><Input autoFocus aria-label="Search notes" value={search} onChange={(event) => setSearch(event.target.value)} /></div>}
        {filter !== undefined && (
          <div className="px-4 py-2">
            <Button size="sm" variant="secondary" aria-label={`Clear filter ${filterLabel(filter, (id) => folders.find((item) => item.id === id)?.name)}`}
              onClick={() => { setFolder(undefined); void call(NotesListFilter, (service) => service.clear()); void call(NotesHandoff, (service) => service.clearFilter()); }}>
              {filterLabel(filter, (id) => folders.find((item) => item.id === id)?.name)}<X aria-hidden />
            </Button>
          </div>
        )}
        {state.priorReview ? <p className="px-4 py-6 text-center text-sm" role="status">{status}</p> : <div className="flex-1 overflow-y-auto pb-24"><NotesList rows={shown} now={Date.now()} onOpen={openNote} /></div>}
        {status !== "" && state.phase !== "Review" && <p className="px-4 font-mono text-xs uppercase text-muted-foreground" role="status">{status}</p>}
        <div className="fixed bottom-24 right-4 flex flex-col gap-3">
          <Button size="icon" variant="secondary" aria-label="Record voice note" disabled={!recorderMachine.can({ type: "beginRecording", viaControl: false })}
            onClick={() => void call(NotesRecorder, (service) => service.begin(folder ?? null, false))}><Mic aria-hidden /></Button>
          <Button size="icon" aria-label="New note" disabled={state.revision < 0 || state.phase === "Saving"}
            onClick={() => void call(NotesEditor, (service) => service.newNote("text", folder))}><Plus aria-hidden /></Button>
        </div>
      </>
    );
  }

  return (
    <ToastProvider>
      <main className="flex h-full flex-col bg-background text-foreground" aria-label="Notes">
        {state.phase === "Review" && (
          <NotesReviewBar status={status} dirty={dirty(editor)} canRetry={editorMachine.can({ type: "retryDraft", untouched: true })}
            canCopy={copyDraftAllowed(editor.review || state.phase === "Review", dirty(editor), true, true, true) && draft !== undefined}
            onDiscard={() => void call(NotesEditor, (service) => service.discard())}
            onRetry={() => void call(NotesEditor, (service) => service.retry()).then((said) => tell(said === "changed-elsewhere" ? "Changed elsewhere" : said === "deleted" ? "Note was deleted" : said === "not-saved" ? "Not saved" : ""))}
            onCopy={() => { if (draft) void copyText(draftCopyText(draft)).then(() => tell("Draft copied."), () => tell("Draft could not be copied.")); }} />
        )}
        {kept !== undefined && (
          <NotesReviewBar status="Kept draft" dirty canRetry={false} canCopy
            onDiscard={() => void call(NotesEditor, (service) => service.discard())}
            onCopy={() => void copyText(draftCopyText(kept)).then(() => tell("Draft copied."), () => tell("Draft could not be copied."))} />
        )}
        {body}
        {earlierNotesAvailable && previousOwner === state.owner && <PreviousDeviceNotes key={state.owner} onClose={() => setPreviousOwner(undefined)} />}
        <FoldersSheet open={foldersLayer.open} folders={folders} {...(folder === undefined ? {} : { selected: folder })} onOpenChange={(open) => { if (!open) foldersLayer.hide(); }}
          onSelect={(id) => { setFolder(id); foldersLayer.hide(); }}
          onCreate={(name) => void call(NotesFolders, (service) => service.create(name)).catch(() => tell("Not created"))}
          onRename={(id, name) => void call(NotesFolders, (service) => service.rename(id, name)).catch(() => tell("Rename failed"))}
          onDelete={(id) => { if (folder === id) setFolder(undefined); void call(NotesFolders, (service) => service.remove(id)).catch(() => tell("Delete failed")); }} />
        <WebSourceDialog dialog={sourceDialog} {...(openRow?.webSource === undefined ? {} : { source: openRow.webSource })}
          onClose={() => void call(NotesSources, (service) => service.closeDialog())}
          onVisit={() => void call(NotesSources, (service) => service.visit())}
          onRemove={() => void call(NotesSources, (service) => service.removeWebSource()).then((said) => tell(said === "removed" ? "" : "Unconfirmed"))} />
        <Sheet open={recorder.phase !== "RecClosed"} onOpenChange={(open) => { if (!open) void call(NotesRecorder, (service) => service.leave()); }}>
          <SheetContent side="bottom" title="Voice note" hideTitle>
            <NoteRecorder recorder={recorder} display={display}
              can={{
                pause: recorderMachine.can({ type: "pauseRecording" }), resume: recorderMachine.can({ type: "resumeRecording" }), stop: recorderMachine.can({ type: "stopRecording" }),
                finish: recorderMachine.can({ type: "finishRecording" }), discard: recorderMachine.can({ type: "discardRecording" }), askDiscard: recorderMachine.can({ type: "askDiscard" }),
                retry: recorderMachine.can({ type: "beginRecording", viaControl: false }),
              }}
              onPause={() => void call(NotesRecorder, (service) => service.pause())}
              onResume={() => void call(NotesRecorder, (service) => service.resume())}
              onStop={() => void call(NotesRecorder, (service) => service.stop())}
              onFinish={() => void call(NotesRecorder, (service) => service.finish())}
              onDiscard={() => void call(NotesRecorder, (service) => service.discard())}
              onAskDiscard={() => void call(NotesRecorder, (service) => service.askDiscard())}
              onKeep={() => void call(NotesRecorder, (service) => service.keep())}
              onRetry={() => void call(NotesRecorder, (service) => service.begin(folder ?? null, false))} />
          </SheetContent>
        </Sheet>
        {receipt !== undefined && receipt !== seenReceipt && shareNoticeText[receipt.notice] !== "" && (
          <Toast open onOpenChange={(open) => { if (!open) setSeenReceipt(receipt); }} title={shareNoticeText[receipt.notice]} />
        )}
        {notice !== undefined && <Toast open onOpenChange={(open) => { if (!open) { notice.onDismiss?.(); setNotice(undefined); } }} title={notice.text} {...(notice.action === undefined ? {} : { action: notice.action })} />}
        <ToastViewport />
      </main>
    </ToastProvider>
  );
}
