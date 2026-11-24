// spec/notes/collection.md, "Story: Read my notes under the account I am signed in as"; spec/notes/editor.md, "Story: Edit a note without losing a word"; spec/notes/list.md, "Story: Narrow the list to what I am looking for"; spec/notes/trash.md, "Story: Recover a deleted note"; spec/notes/recorder.md, "Story: Record a voice note"; spec/notes/share.md, "Story: Share the note I have open"; spec/notes/share.md, "One document operation runs at a time, and its receipt shows only in its own visible visit"; spec/notes/trash.md, "A restore needs the exact deletion and the current revision, and a delete's Undo the exact deletion"
import { Effect } from "effect";
import { Ellipsis, Folder, Mic, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ScreenProps } from "../app-screen.ts";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input, Sheet, SheetContent, Toast, ToastProvider, ToastViewport } from "../components/ui/index.ts";
import { statusLabel, type Collection } from "../../../gen/notes__collection.ts";
import { copyDraftAllowed, dirty, type Editor } from "../../../gen/notes__editor.ts";
import type { Recorder } from "../../../gen/notes__recorder.ts";
import { deleteUndoMs, type TrashView } from "../../../gen/notes__trash.ts";
import type { SourceDialog } from "../../../gen/notes__webSource.ts";
import { NotesAudio } from "../../notes/audio.vibe";
import { NotesEditor, type DraftContent, type KeptReview, type NoteDeletion } from "../../notes/editor.vibe";
import { NotesFolders, type NotesFolder } from "../../notes/folders.vibe";
import { filterRows, matchesText, shownRows, type NoteRow, type NotesFilter } from "../../notes/list.vibe";
import { NotesListFilter } from "../../notes/listFilter.vibe";
import { NotesHandoff, NotesOrigins } from "../../notes/origins.vibe";
import { NotesRecorder, type RecorderDisplay } from "../../notes/recorder.vibe";
import { type DocumentReceipt, NotesShare, type ShareChannel } from "../../notes/share.vibe";
import { NotesSources } from "../../notes/sources.vibe";
import { NotesTrash, type TrashNotice, type TrashRow } from "../../notes/trash.vibe";
import { copyText } from "../../notes/platform.ts";
import { draftCopyText } from "../../notes/share.vibe";
import { testMocksBuilt } from "../../platform/build-flags.ts";
import type { call as runCall } from "../shell/services.ts";
import type { useLayer } from "../shell/useLayer.ts";
import { FoldersSheet } from "./FoldersSheet.tsx";
import { shareNoticeText, statusText, trashNoticeText } from "./messages.ts";
import { NoteEditor } from "./NoteEditor.tsx";
import { NoteRecorder, type NoteRecorderProps } from "./NoteRecorder.tsx";
import { NotesList } from "./NotesList.tsx";
import { PreviousDeviceNotes } from "./PreviousDeviceNotes.tsx";
import { NotesReviewBar } from "./NotesReviewBar.tsx";
import { NotesTrash as TrashPanel } from "./NotesTrash.tsx";
import { WebSourceDialog } from "./WebSourceDialog.tsx";

const kindNames: Record<NonNullable<NotesFilter["kind"]>, string> = { text: "Notes", list: "Checklists", voice: "Voice notes", link: "Links" };

/** The chip text of an active filter, such as “term sheet” · Voice notes · Work. */
function filterLabel(filter: NotesFilter, folderName: (id: string) => string | undefined): string {
  return [filter.text ? `“${filter.text}”` : "", filter.kind ? kindNames[filter.kind] : "", filter.folder ? folderName(filter.folder) ?? "" : ""].filter(Boolean).join(" · ") || "All notes";
}

/** What Notes may do now, as the trash, editor and recorder Machines allow it. */
export interface NotesScreenCan {
  /** Recently deleted may open. */
  readonly openTrash: boolean;
  /** A deleted row may be reviewed. */
  readonly askRow: boolean;
  /** The reviewed row may be restored. */
  readonly restoreRow: boolean;
  /** Erasing may be reviewed. */
  readonly askErase: boolean;
  /** The reviewed rows may be erased. */
  readonly eraseRows: boolean;
  /** A draft whose save failed may be retried. */
  readonly retryDraft: boolean;
  /** A voice note may start recording. */
  readonly beginRecording: boolean;
}

/** A sheet listed in the shell's navigation, so Back and HOME close it. */
export type NotesLayer = ReturnType<typeof useLayer>;

/** The Notes screen's machine states and service reads, what may be done now, and the Notes services its controls call. */
export interface NotesScreenViewProps extends ScreenProps {
  /** The canonical collection of the signed-in owner. */
  collection: Collection;
  /** The editor's draft state. */
  editor: Editor;
  /** Recently deleted. */
  trash: TrashView;
  /** The voice-note recorder. */
  recorder: Recorder;
  /** The web source dialog. */
  sourceDialog: SourceDialog;
  /** The collection's notes as rows, newest first. */
  rows: readonly NoteRow[];
  /** The open note's draft. */
  draft: DraftContent | undefined;
  /** A draft kept for review after its save could not be confirmed. */
  kept: KeptReview | undefined;
  /** The rows of Recently deleted. */
  deleted: readonly TrashRow[];
  /** The recorder's clock, levels, transcript and playback position. */
  display: RecorderDisplay;
  /** The owner's folders. */
  folders: readonly NotesFolder[];
  /** The filter the assistant shows. */
  agentFilter: NotesFilter | undefined;
  /** The filter another app asked Notes to open with. */
  requestedFilter: NotesFilter | undefined;
  /** The latest share or import receipt of this visit. */
  receipt: DocumentReceipt | undefined;
  /** Notes kept by an earlier installation can be read on this phone. */
  earlierNotesAvailable: boolean;
  /** The clock time the list's dates count from. */
  now: number;
  /** What may be done now. */
  can: NotesScreenCan;
  /** What the recorder sheet may do now. */
  recorderCan: NoteRecorderProps["can"];
  /** The folders sheet's navigation layer. */
  foldersLayer: NotesLayer;
  /** The Notes list selection, closed by Back with the rest of Notes' layers. */
  selectionLayer: NotesLayer;
  /** Runs one call of a Notes service. */
  call: typeof runCall;
}

/**
 * The Notes app's whole screen: the canonical list, the editor, Recently deleted, and the recorder.
 * @model spec/notes/collection.md
 */
export function NotesScreenView({
  onClose, collection, editor, trash, recorder, sourceDialog, rows, draft, kept, deleted, display, folders, agentFilter, requestedFilter, receipt,
  earlierNotesAvailable, now, can, recorderCan, foldersLayer, selectionLayer, call,
}: NotesScreenViewProps) {
  const [seenReceipt, setSeenReceipt] = useState<DocumentReceipt>();
  const [previousOwner, setPreviousOwner] = useState<number>();
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [folder, setFolder] = useState<string>();
  const [asked, setAsked] = useState<TrashRow>();
  const [transcribing, setTranscribing] = useState(false);
  const [notice, setNotice] = useState<{ text: string; action?: { label: string; onAction: () => void }; onDismiss?: () => void; duration?: number }>();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [selectingOwner, setSelectingOwner] = useState<number>();
  const [deletingSelection, setDeletingSelection] = useState(false);
  const batch = useRef<AbortController>(undefined);

  const state = collection;
  const selecting = selectionLayer.open && selectingOwner === state.owner;
  useEffect(() => () => batch.current?.abort(), [selecting, state.owner]);
  if (previousOwner !== undefined && (!earlierNotesAvailable || previousOwner !== state.owner)) setPreviousOwner(undefined);
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
  const showDeleteNotice = async (deletions: readonly NoteDeletion[], owner: number, askedCount: number) => {
    if (deletions.length === 0) return;
    await call(NotesTrash, (service) => service.deleted());
    let undoPressed = false;
    const text = deletions.length < askedCount ? `Deleted ${deletions.length} of ${askedCount} notes`
      : deletions.length === 1 ? "Deleted" : `Deleted ${deletions.length} notes`;
    setNotice({
      text, duration: deleteUndoMs,
      action: { label: "Undo", onAction: () => {
        undoPressed = true;
        void call(NotesTrash, (service) => service.undoSelected(deletions, owner)).then(tellTrash);
      } },
      onDismiss: () => { if (!undoPressed) void call(NotesTrash, (service) => service.dismissUndo()); },
    });
  };

  const leave = () => void call(NotesEditor, (service) => service.leave());
  const openNote = (id: string) => void call(NotesEditor, (service) => service.leave(id));
  const edit = (patch: Parameters<NotesEditor.Shape["edit"]>[0]) => void call(NotesEditor, (service) => Effect.andThen(service.edit(patch), service.save()));
  const remove = () => {
    const id = editor.draftId;
    void call(NotesEditor, (service) => service.remove(id)).then((outcome) => {
      if (!outcome.deleted || outcome.deletedAt === undefined) return;
      return showDeleteNotice([{ id, deletedAt: outcome.deletedAt }], state.owner, 1);
    });
  };
  const toggleSelection = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const removeSelection = async () => {
    if (batch.current !== undefined || !selecting) return;
    const visible = new Set(shown.map((note) => note.id));
    const ids = [...selected].filter((id) => visible.has(id));
    if (ids.length === 0) return;
    const controller = new AbortController();
    batch.current = controller;
    setDeletingSelection(true);
    try {
      const deleted = await call(NotesEditor, (service) => service.removeSelected(ids, state.owner, controller.signal));
      if (!controller.signal.aborted) {
        const completed = new Set(deleted.map((entry) => entry.id));
        setSelected((current) => new Set([...current].filter((id) => !completed.has(id))));
        if (deleted.length === ids.length) selectionLayer.hide();
        if (deleted.length === 0) tell("No notes deleted.");
        await showDeleteNotice(deleted, state.owner, ids.length);
      }
    } finally {
      batch.current = undefined;
      setDeletingSelection(false);
    }
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
      <TrashPanel view={trash} rows={deleted} {...(asked === undefined ? {} : { asked })}
        canAsk={can.askRow} canRestore={can.restoreRow}
        canAskErase={can.askErase} canErase={can.eraseRows}
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
          <h1 className="flex-1 font-display text-3xl">{selecting ? (selected.size > 0 ? `${selected.size} selected` : "Select notes") : "Notes"}</h1>
          {selecting ? <>
            <Button variant="ghost" disabled={deletingSelection} onClick={selectionLayer.hide}>Done</Button>
            <Button variant="destructive" disabled={deletingSelection || selected.size === 0 || state.phase !== "Ready"} onClick={() => void removeSelection()}>Delete</Button>
          </> : <>
          <Button variant="ghost" size="icon" aria-label="Search notes" onClick={() => setSearching(!searching)}><Search aria-hidden /></Button>
          <Button variant="ghost" size="icon" aria-label="Folders" onClick={() => { foldersLayer.show(); void call(NotesFolders, (service) => service.list()); }}><Folder aria-hidden /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Notes options"><Ellipsis aria-hidden /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={!can.openTrash} onSelect={() => void call(NotesTrash, (service) => service.open())}>Recently deleted</DropdownMenuItem>
              {shown.length > 0 && state.phase === "Ready" && <DropdownMenuItem onSelect={() => {
                setSelected(new Set());
                setSelectingOwner(state.owner);
                selectionLayer.show();
              }}>Select notes</DropdownMenuItem>}
              {testMocksBuilt && <DropdownMenuItem onSelect={() => void call(NotesShare, (service) => service.importText()).then((said) => { if (said === "busy" || said === "unavailable") tell(shareNoticeText[said]); })}>Import text file</DropdownMenuItem>}
              {earlierNotesAvailable && <DropdownMenuItem onSelect={() => setPreviousOwner(state.owner)}>Previous notes</DropdownMenuItem>}
              <DropdownMenuItem onSelect={onClose}>Close Notes</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </>}
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
        {state.priorReview ? <p className="px-4 py-6 text-center text-sm" role="status">{status}</p> : <div className="flex-1 overflow-y-auto pb-24"><NotesList rows={shown} now={now} onOpen={selecting ? toggleSelection : openNote} selection={selecting ? { ids: selected, busy: deletingSelection } : undefined} /></div>}
        {status !== "" && state.phase !== "Review" && <p className="px-4 font-mono text-xs uppercase text-muted-foreground" role="status">{status}</p>}
        {!selecting && <div className="fixed bottom-24 right-4 flex flex-col gap-3">
          <Button size="icon" variant="secondary" aria-label="Record voice note" disabled={!can.beginRecording}
            onClick={() => void call(NotesRecorder, (service) => service.begin(folder ?? null, false))}><Mic aria-hidden /></Button>
          <Button size="icon" aria-label="New note" disabled={state.revision < 0 || state.phase === "Saving"}
            onClick={() => void call(NotesEditor, (service) => service.newNote("text", folder))}><Plus aria-hidden /></Button>
        </div>}
      </>
    );
  }

  return (
    <ToastProvider>
      <main className="flex h-full flex-col bg-background text-foreground" aria-label="Notes">
        {state.phase === "Review" && (
          <NotesReviewBar status={status} dirty={dirty(editor)} canRetry={can.retryDraft}
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
              can={recorderCan}
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
        {notice !== undefined && <Toast open onOpenChange={(open) => { if (!open) { notice.onDismiss?.(); setNotice(undefined); } }} title={notice.text} duration={notice.duration} {...(notice.action === undefined ? {} : { action: notice.action })} />}
        <ToastViewport />
      </main>
    </ToastProvider>
  );
}
