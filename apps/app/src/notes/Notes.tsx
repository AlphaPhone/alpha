// spec/app/notes/index.md, "Story: See my notes"; spec/app/notes/index.md, "Story: Organise my notes"; spec/app/notes/editor.md, "Story: Write a note"; spec/app/notes/trash.md, "Story: Delete a note and get it back"
import { Alert, AppHeader, Button, Chip, cn, Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, dockClearance, Input, LinkNoteView, Menu, MenuContent, MenuItem, MenuTrigger, NoteEditor as NoteForm, NoteMenu, NoteRow, NotesList as NoteRows, Spinner, VoiceNoteView } from "@repo/ui";
import { Copy, Download, Ellipsis, FileDown, Folder, Mail, MessageSquare, Mic, Plus, Share2, Trash2, X } from "lucide-react";
import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import * as Notes from "../../gen/app__notes.ts";
import * as Editor from "../../gen/app__notes__editor.ts";
import * as Trash from "../../gen/app__notes__trash.ts";
import type { Destination } from "../../gen/app__notes__voice.ts";
import { useMachine as useActions } from "../../gen/app__notes__actions.react.ts";
import { useMachine as useNotes } from "../../gen/app__notes.react.ts";
import { useMachine as useEditor } from "../../gen/app__notes__editor.react.ts";
import { useMachine as useTrash } from "../../gen/app__notes__trash.react.ts";
import { useMachine as useLink } from "../../gen/app__notes__linkNote.react.ts";
import { useMachine as useMic } from "../../gen/app__notes__microphone.react.ts";
import { useMachine as useRecorder } from "../../gen/app__notes__recording.react.ts";
import { useMachine as usePrevious } from "../../gen/app__notes__previous.react.ts";
import { useMachine as useTransfer } from "../../gen/app__notes__transfer.react.ts";
import { useMachine as useVoice } from "../../gen/app__notes__voice.react.ts";
import { NoteDocuments } from "../platform/noteDocuments.vibe";
import { native } from "../platform/device.vibe";
import { NoteDevice } from "../platform/noteDevice.vibe";
import { unfinished } from "../../gen/app__notes__recording.ts";
import type { Alpha } from "../runtime/area.tsx";
import { fresh } from "../runtime/attempts.vibe";
import { untimed } from "../runtime/reactor.vibe";
import { AppBack } from "../shell/AppBack.tsx";
import { type Collection, type DraftWords, NoteContent, audioIdOf, hasContent, numberOf, savedVoice, sourced } from "./content.vibe";
import { NoteEditor } from "./editor.vibe";
import { discardNote, enter } from "./notes.vibe";
import { record } from "./recording.vibe";
import { Previous } from "./Previous.tsx";
import { clock, dated, preview, titleOf } from "./present.ts";
import { Recording } from "./Recording.tsx";
import { RecentlyDeleted } from "./RecentlyDeleted.tsx";
import { VoiceReview, copyTranscript, generateTranscript, pageOf } from "./sides.vibe";

type Runtime = Alpha["runtime"];
type Form = { readonly op: "AddFolder" } | { readonly op: "RenameFolder"; readonly folder: Notes.Folder };

const transferNotices = {
  Done: "Saved.",
  NotDone: "The file couldn't be saved.",
  Unsure: "Alpha couldn't confirm the file. Check it before trying again.",
  NoAccess: "The selected file couldn't be accessed.",
  Unread: "This file must contain readable text.",
} as const;

function segmentIndexFor(segments: ReadonlyArray<unknown>, offsetMs: number, count: number, maxAllowed: number): number {
  const cap = Math.max(0, Math.min(count - 1, maxAllowed));
  let elapsed = 0;
  for (let index = 0; index < segments.length && index <= cap; index++) {
    const row = segments[index];
    const duration = typeof row === "object" && row !== null && "durationMs" in row && typeof row.durationMs === "number" ? row.durationMs : 30_000;
    if (offsetMs < elapsed + duration) return index;
    elapsed += duration;
  }
  return cap;
}

function TransferNotice({ runtime }: { readonly runtime: Runtime }) {
  const transfer = useTransfer(runtime);
  const notice = transfer.state?.notice;
  if (notice === undefined || notice === "Quiet") return null;
  const dismiss = { type: "dismiss" } as const;
  return <Alert variant={notice === "Done" ? "info" : "warn"} className="mb-2">
    {transferNotices[notice]}
    {transfer.can(dismiss, "Owner") && <Button size="sm" variant="ghost" onClick={() => void transfer.send(dismiss, "Owner")}>Dismiss</Button>}
  </Alert>;
}

function EditorScreen({ runtime, saved }: { readonly runtime: Runtime; readonly saved: DraftWords }) {
  const writing = useEditor(runtime);
  const actions = useActions(runtime);
  const bin = useTrash(runtime).state;
  const transfer = useTransfer(runtime);
  const hasDocuments = runtime.runSync(NoteDocuments).available;
  const writer = runtime.runSync(NoteEditor);
  const content = runtime.runSync(NoteContent);
  const [next, setNext] = useState("");
  const current = writing.state;
  if (!current?.showing) return null;
  const owner = (event: Editor.Event) => writing.can(event, "Owner");
  const send = (event: Editor.Event) => void writing.send(event, "Owner");
  const edit = (mutate: (draft: DraftWords) => DraftWords) => {
    const updated = content.updateDraft(mutate);
    if (updated !== undefined) void runtime.runPromise(writer.syncEdit(updated));
  };
  const action = (kind: "close" | "save" | "takeSaved" | "keepMine" | "keepAsNew") =>
    void runtime.runPromise(writer[kind]());
  const close = owner({ type: "close" }) ? () => action("close") : undefined;
  const checklist = saved.kind === "Checklist";
  const deletion: Editor.Event = { type: "deleteNote", ready: bin !== undefined && Trash.ready(bin) };
  const deletable = owner(deletion);
  const exporting = { type: "exportNote", note: current.note, revision: current.draft.base } as const;
  const sharing = { type: "openMenu", note: current.note, link: current.link, saved: current.draft.sync === "Kept" && !current.deleting } as const;
  const shared = sharing.saved && (actions.can(sharing, "Owner") || actions.state?.open === true);
  const shareEmail = { type: "share", channel: "Email", mark: current.link.mark } as const;
  const shareMessages = { type: "share", channel: "Messages", mark: current.link.mark } as const;
  const exportable = hasDocuments && current.draft.sync === "Kept" && transfer.can(exporting, "Owner");
  const editable = owner({ type: "edit", kept: true });
  const status = current.draft.sync === "Saving" ? "Saving…" : current.failed ? "Couldn't save the note"
    : current.full ? "There isn't room to keep your draft" : current.told === "WasUnknown" ? "Alpha couldn't confirm the deletion"
      : current.told === "WasRefused" ? "Couldn't delete the note" : current.told === "WasFull" ? "Recently deleted is full" : undefined;
  const menu = (deletable || exportable || shared) && <Menu onOpenChange={(open) => {
    if (open && actions.can(sharing, "Owner")) void actions.send(sharing, "Owner");
    if (!open && actions.can({ type: "closeMenu" }, "Owner")) void actions.send({ type: "closeMenu" }, "Owner");
  }}>
    <MenuTrigger asChild><Button aria-label="Note actions" size="icon" variant="ghost"><Ellipsis /></Button></MenuTrigger>
    <MenuContent align="end">
      {shared && actions.state?.open && <>
        {actions.can(shareEmail, "Owner") && <MenuItem onSelect={() => void actions.send(shareEmail, "Owner")}><Mail /> Share by email</MenuItem>}
        {actions.can(shareMessages, "Owner") && <MenuItem onSelect={() => void actions.send(shareMessages, "Owner")}><MessageSquare /> Share in Messages</MenuItem>}
      </>}
      {exportable && <MenuItem onSelect={() => void transfer.send(exporting, "Owner")}><FileDown /> Save as text</MenuItem>}
      {deletable && <MenuItem destructive onSelect={() => send(deletion)}><Trash2 /> Delete</MenuItem>}
    </MenuContent>
  </Menu>;
  return (
    <NoteForm
      className="relative inset-auto flex-1"
      data-alpha-subview="notes-editor"
      title={saved.title}
      body={saved.body}
      kind={checklist ? "list" : "text"}
      items={saved.items.map((item, index) => ({ key: item.id ?? `${saved.creation}:${index}`, text: item.t, done: item.done }))}
      next={next}
      locked={!editable}
      status={status}
      menu={menu}
      onTitle={(title) => edit((draft) => ({ ...draft, title: title.slice(0, 240) }))}
      onBody={(body) => edit((draft) => ({ ...draft, body: body.slice(0, 20_000) }))}
      onItem={(index, item) => edit((draft) => ({ ...draft, items: draft.items.map((old, at) => at === index ? { ...old, t: item.text.slice(0, 500), done: item.done } : old) }))}
      onRemoveItem={(index) => edit((draft) => ({ ...draft, items: draft.items.filter((_, at) => at !== index) }))}
      onNext={setNext}
      onAddItem={() => {
        const text = next.trim().slice(0, 500);
        if (text !== "") {
          edit((draft) => ({ ...draft, items: [...draft.items, { id: fresh(), t: text, done: false }] }));
          setNext("");
        }
      }}
      onFormat={editable ? () => edit((draft) => draft.kind === "Checklist"
        ? { ...draft, kind: "Text", body: draft.items.map((row) => row.t).join("\n"), items: [] }
        : { ...draft, kind: "Checklist", items: draft.body.split("\n").filter((line) => line.trim() !== "").map((t) => ({ id: fresh(), t: t.slice(0, 500), done: false })), body: "" }) : undefined}
      onBack={close}
      onDone={close}
      feedback={<>
        <TransferNotice runtime={runtime} />
        {current.draft.sync === "Conflicted" && <Alert variant="warn" className="mb-2">This note changed while you were writing.
          <div className="mt-2 flex flex-wrap gap-2">
            {owner({ type: "keepMine" }) && <Button size="sm" onClick={() => action("keepMine")}>Keep mine</Button>}
            {owner({ type: "takeSaved" }) && <Button size="sm" variant="secondary" onClick={() => action("takeSaved")}>Use saved note</Button>}
          </div>
        </Alert>}
        {current.gone && <Alert variant="warn" className="mb-2">This note was deleted while you were writing.
          <div className="mt-2 flex flex-wrap gap-2">
            {owner({ type: "keepAsNew" }) && <Button size="sm" onClick={() => action("keepAsNew")}>Keep as a new note</Button>}
          </div>
        </Alert>}
        {current.failed && owner({ type: "save" }) && hasContent(saved) && <Button className="self-start" size="sm" onClick={() => action("save")}>Try again</Button>}
      </>}
    />
  );
}

function LinkedNote({ runtime, collection }: { readonly runtime: Runtime; readonly collection: Collection }) {
  const link = useLink(runtime);
  const bin = useTrash(runtime);
  const state = link.state;
  if (!state?.showing) return null;
  const note = collection.noteByNumber.get(state.note);
  const data = note?.format?.data;
  const page = pageOf(data?.url);
  const liveMark = note === undefined ? state.link.mark : sourced(note).source.mark;
  const visitEvent = { type: "visit", mark: liveMark } as const;
  const backEvent = { type: "back" } as const;
  const close = link.can(backEvent, "Owner") ? () => void link.send(backEvent, "Owner") : undefined;
  const askRemove = { type: "askRemove" } as const;
  const confirmRemove = { type: "confirmRemove" } as const;
  const discardEvent: Trash.Event = { type: "discard", id: state.note, revision: state.revision, recording: 0, asked: 1, now: untimed, storage: true };
  const canAskRemove = link.can(askRemove, "Owner");
  const canDelete = note !== undefined && state.revision === collection.version && bin.can(discardEvent, "Owner");
  const clips = Array.isArray(data?.clips) ? data.clips.filter((part): part is string => typeof part === "string") : [];
  if (clips.length === 0 && note?.body.trim()) clips.push(note.body);
  return <LinkNoteView
    className="relative inset-auto flex-1"
    title={note === undefined ? "Link note" : titleOf(note)}
    domain={typeof data?.domain === "string" ? data.domain : URL.parse(page)?.hostname ?? ""}
    clips={clips}
    onBack={close}
    onVisit={page !== "" && link.can(visitEvent, "Owner") ? () => void link.send(visitEvent, "Owner") : undefined}
    menu={(canAskRemove || canDelete) && <Menu>
      <MenuTrigger asChild><Button aria-label="Link actions" size="icon" variant="ghost"><Ellipsis /></Button></MenuTrigger>
      <MenuContent align="end">
        {canAskRemove && <MenuItem onSelect={() => void link.send(askRemove, "Owner")}>Remove source</MenuItem>}
        {canDelete && <MenuItem destructive onSelect={() => void runtime.runPromise(discardNote(state.note, state.revision, 0))}><Trash2 /> Delete</MenuItem>}
      </MenuContent>
    </Menu>}
    feedback={<>
      {state.changed && <Alert variant="warn" className="mt-4">This note changed. Reopen it to continue.</Alert>}
      {state.removal.outcome === "Refused" && <Alert variant="warn" className="mt-4">Couldn’t remove the web source.</Alert>}
      {state.removal.outcome === "Unknown" && <Alert variant="warn" className="mt-4">Alpha couldn’t confirm removing the web source.</Alert>}
      {state.review.showing && <Alert variant="warn" className="mt-4">Remove the web source from this note?
        <div className="mt-2 flex gap-2">
          {close && <Button variant="secondary" onClick={close}>Cancel</Button>}
          {link.can(confirmRemove, "Owner") && <Button variant="destructive" onClick={() => void link.send(confirmRemove, "Owner")}>Remove</Button>}
        </div>
      </Alert>}
    </>}
  />;
}

function speaker(value: unknown) {
  const words = typeof value === "string" ? value.trim().split(/\s+/).filter(Boolean) : [];
  if (words.length === 0 || value === "me") return { initials: "You", who: "You", own: true };
  return { initials: words.map((word) => word[0]).join("").slice(0, 2).toUpperCase(), who: words[0] ?? "", own: false };
}

const destinations = [
  { destination: "EmailText", label: "Email", Icon: Mail },
  { destination: "SystemShare", label: "Share", Icon: Share2 },
  { destination: "CopyText", label: "Copy text", Icon: Copy },
  { destination: "SaveText", label: "Save file", Icon: Download },
] as const;

function VoiceSharePanel({ open, close, choose, canSave, restore }: {
  readonly open: boolean;
  readonly close: () => void;
  readonly choose: (destination: Destination) => void;
  readonly canSave: boolean;
  readonly restore: () => void;
}) {
  return <Dialog open={open} onOpenChange={(shown) => { if (!shown) close(); }}>
    <DialogContent aria-describedby={undefined} overlayClassName="bg-foreground/35 dark:bg-background/35"
      className="inset-x-3 top-auto bottom-[calc(max(6.75rem,var(--alpha-dock-overlap,0px),var(--alpha-safe-bottom))+--spacing(2))] mx-auto max-h-[80dvh] max-w-lg translate-y-0 gap-0 overflow-y-auto rounded-panel bg-background shadow-none"
      onCloseAutoFocus={(event) => { event.preventDefault(); restore(); }}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <DialogTitle className="text-2xl font-bold">Share</DialogTitle>
        <DialogClose asChild><Button size="icon" variant="secondary" className="size-11 rounded-full" aria-label="Close share"><X className="size-5.5" /></Button></DialogClose>
      </div>
      <div className="flex flex-col gap-2">
        {destinations.filter(({ destination }) => destination !== "SaveText" || canSave).map(({ destination, label, Icon }) =>
          <Button key={destination} variant="secondary" className="h-13 justify-start gap-3 rounded-lg px-4 text-base font-normal" onClick={() => choose(destination)}>
            <Icon aria-hidden className="size-5.25" />{label}
          </Button>)}
      </div>
    </DialogContent>
  </Dialog>;
}

function VoiceNote({ runtime, collection }: { readonly runtime: Runtime; readonly collection: Collection }) {
  const voice = useVoice(runtime);
  const bin = useTrash(runtime);
  const device = runtime.runSync(NoteDevice);
  const review = runtime.runSync(VoiceReview);
  const staged = useSyncExternalStore(review.subscribe, review.snapshot, review.snapshot);
  const moreRef = useRef<HTMLButtonElement>(null);
  const state = voice.state;
  if (!state?.showing) return null;
  const note = collection.noteByNumber.get(state.note);
  const data = note?.format?.data;
  const saved = note === undefined ? undefined : savedVoice(note);
  const lines = saved?.lines.map((line) => ({ ...speaker(line.who), at: clock(line.at), text: line.text })) ?? [];
  const ms = saved?.durationMs;
  const length = ms === undefined ? "" : clock(ms / 1000);
  const play = { type: "play", from: 0 } as const;
  const stop = { type: "stopPlaying" } as const;
  const ask = { type: "askAlpha" } as const;
  const transcribe = { type: "transcribe" } as const;
  const retry = { type: "retryTranscription" } as const;
  const cancel = { type: "cancelTranscription" } as const;
  const showTranscript = { type: "showTranscript" } as const;
  const addTranscript = { type: "addTranscript" } as const;
  const back = { type: "back" } as const;
  const audioId = note === undefined ? "" : audioIdOf(note);
  const audio = audioId !== "";
  const recordingNumber = audio ? numberOf("recording", audioId) : 0;
  const current = state.revision === collection.version;
  const pending = current && state.heard > state.added && staged !== undefined
    && staged.owner === state.owner && staged.note === state.note && staged.revision === state.revision && staged.upTo === state.heard
    ? staged : undefined;
  const pinned = note?.format?.data.pinned === true;
  const pin = { type: "setPinned", pinned: !pinned } as const;
  const share = { type: "openShare" } as const;
  const closeShare = { type: "closeShare" } as const;
  const discardVoice: Trash.Event = { type: "discard", id: state.note, revision: state.revision, recording: recordingNumber, asked: 1, now: untimed, storage: true };
  const canDelete = current && note !== undefined && bin.can(discardVoice, "Owner");
  const chooseDestination = (destination: Destination) => {
    const event = { type: "shareText", destination } as const;
    if (current && voice.can(event, "Owner")) void voice.send(event, "Owner");
  };
  const canPin = current && note !== undefined && voice.can(pin, "Owner");
  const pinWrite = state.part === "Pin" || state.part === "Unpin";
  const canTranscribe = device.canTranscribe && audio && current && state.added === 0 && voice.can(transcribe, "Phone");
  const canRetry = device.canTranscribe && audio && current && voice.can(retry, "Owner");
  const generate = (again = false) => void runtime.runPromise(generateTranscript(state.note, state.revision, again));
  const canUseTranscript = current && note !== undefined && lines.length > 0 && voice.can(ask, "Owner");
  const copy = canUseTranscript ? () => void runtime.runPromise(copyTranscript({
    owner: state.owner, number: state.note, opened: state.opened,
    record: { kind: "canonical-note", id: note.id, revision: String(state.revision - 1) },
  })) : undefined;
  const player = device.available && audio;
  const canPlay = player && current && voice.can(play, "Owner");
  const toggle = voice.can(stop, "Owner") ? () => void voice.send(stop, "Owner") : canPlay ? () => { review.seekTo(undefined); void voice.send(play, "Owner"); } : undefined;
  const segments = Array.isArray(data?.segments) ? data.segments : undefined;
  const seek = canPlay && segments !== undefined && segments.length > 0 && saved !== undefined ? (lineIndex: number) => {
    const line = saved.lines[lineIndex];
    const offsetMs = line === undefined ? 0 : Math.max(0, Math.round(line.at * 1000));
    const from = segmentIndexFor(segments, offsetMs, state.segments, state.heard);
    const event = { type: "play", from } as const;
    if (voice.can(event, "Owner")) {
      review.seekTo(offsetMs);
      void voice.send(event, "Owner");
    }
  } : undefined;
  return <VoiceNoteView
    className="relative inset-auto flex-1"
    title={note === undefined ? "Voice note" : titleOf(note)}
    meta={note === undefined ? "" : [dated(note, collection.readAt), length].filter(Boolean).join(" · ")}
    playback={player ? { time: length, playing: state.play.status === "Loading", toggle, seek } : undefined}
    summary={saved?.summary}
    actions={saved?.actions}
    lines={lines}
    menu={note !== undefined && <NoteMenu pinned={pinned} triggerRef={moreRef}
      onPin={canPin ? () => void voice.send(pin, "Owner") : undefined}
      onShare={current && voice.can(share, "Owner") ? () => void voice.send(share, "Owner") : undefined}
      onDelete={canDelete ? () => void runtime.runPromise(discardNote(state.note, state.revision, recordingNumber)) : undefined} />}
    onAskTranscript={canUseTranscript ? () => void voice.send(ask, "Owner") : undefined}
    onCopyTranscript={copy}
    onBack={voice.can(back, "Owner") ? () => void voice.send(back, "Owner") : undefined}
    feedback={<>
      <TransferNotice runtime={runtime} />
      {state.shareNotice === "Copied" && <Alert variant="info" className="mt-4">Note text copied.</Alert>}
      {state.shareNotice === "ShareUnavailable" && <Alert variant="warn" className="mt-4">Sharing is unavailable.</Alert>}
      <VoiceSharePanel open={state.sharing && current}
        close={() => { if (voice.can(closeShare, "Owner")) void voice.send(closeShare, "Owner"); }}
        choose={chooseDestination} canSave={!native() || runtime.runSync(NoteDocuments).available}
        restore={() => moreRef.current?.focus({ preventScroll: true })} />
      {canTranscribe && <Button className="mt-4" variant="secondary" onClick={() => generate()}>Generate transcript</Button>}
      {state.listen.status === "Loading" && <div className="mt-4 flex items-center gap-2">
        <Spinner label="Transcribing on this phone" />
        <span className="text-sm text-muted-foreground">Transcribing…</span>
        {voice.can(cancel, "Owner") && <Button variant="ghost" size="sm" aria-label="Cancel transcription" onClick={() => void voice.send(cancel, "Owner")}>Cancel</Button>}
      </div>}
      {state.deaf && <Alert variant="warn" className="mt-4">This recording couldn't be transcribed</Alert>}
      {canRetry && <Button className="mt-4" variant="secondary" onClick={() => generate(true)}>Try again</Button>}
      {pending !== undefined && voice.can(showTranscript, "Owner") && <Button className="mt-4" variant="secondary" onClick={() => void voice.send(showTranscript, "Owner")}>Review transcript</Button>}
      {state.writing.outcome === "Refused" && <Alert variant="warn" className="mt-4">{pinWrite ? "The pin couldn’t be changed." : "The transcript couldn’t be added. Reopen the note to review its saved version."}</Alert>}
      {state.writing.outcome === "Unknown" && <Alert variant="warn" className="mt-4">{pinWrite ? "Alpha couldn’t confirm the pin change. Reopen the note to check." : "Alpha couldn’t confirm the transcript was added. Reopen the note to check."}</Alert>}
      {state.play.status === "Failed" && <Alert variant="warn" className="mt-4">This recording couldn't be played</Alert>}
      {state.unconfirmed && <Alert variant="warn" className="mt-4">Playback couldn’t be stopped. Try again.</Alert>}
      <Dialog open={pending !== undefined && state.review.showing} onOpenChange={(open) => { if (!open && state.review.showing && voice.can(back, "Owner")) void voice.send(back, "Owner"); }}>
        <DialogContent>
          <DialogTitle>Review transcript</DialogTitle>
          <DialogDescription>Read the transcript before you add it to the voice note.</DialogDescription>
          <div className="max-h-60 overflow-y-auto whitespace-pre-wrap">{pending?.lines.map((line) => <p key={`${line.at}:${line.t}`} className="mb-2">{line.t}</p>)}</div>
          <div className="flex justify-end gap-2">
            {voice.can(back, "Owner") && <Button variant="secondary" onClick={() => void voice.send(back, "Owner")}>Cancel</Button>}
            {voice.can(addTranscript, "Owner") && <Button onClick={() => void voice.send(addTranscript, "Owner")}>Add to note</Button>}
          </div>
        </DialogContent>
      </Dialog>
    </>}
  />;
}

function NotesList({ alpha, runtime }: { readonly alpha: Alpha; readonly runtime: Runtime }) {
  const list = useNotes(runtime);
  const editor = useEditor(runtime);
  const links = useLink(runtime);
  const voice = useVoice(runtime);
  const bin = useTrash(runtime);
  const mic = useMic(runtime);
  const recorder = useRecorder(runtime);
  const previous = usePrevious(runtime);
  const transfer = useTransfer(runtime);
  const hasDocuments = runtime.runSync(NoteDocuments).available;
  const hasMic = runtime.runSync(NoteDevice).available;
  const writer = runtime.runSync(NoteEditor);
  const content = runtime.runSync(NoteContent);
  const data = useSyncExternalStore(content.subscribe, content.snapshot, content.snapshot);
  const [form, setForm] = useState<Form>();
  const [folderName, setFolderName] = useState("");
  const optionsRef = useRef<HTMLButtonElement>(null);
  const state = list.state;
  const writing = editor.state;
  if (state === undefined || writing === undefined) return null;
  const { collection, draft } = data;
  const listEvent = (event: Notes.Event) => void list.send(event, "Owner");
  const can = (event: Notes.Event) => list.can(event, "Owner");
  if (previous.state?.showing) return <Previous runtime={runtime} />;
  if (bin.state?.showing) return <RecentlyDeleted runtime={runtime} collection={collection} />;
  if (links.state?.showing) return <LinkedNote runtime={runtime} collection={collection} />;
  if (voice.state?.showing) return <VoiceNote runtime={runtime} collection={collection} />;
  if (writing.showing && draft !== undefined) return <>
    <EditorScreen key={draft.creation} runtime={runtime} saved={draft} />
    {bin.state?.question === "AskFull" && <RecentlyDeleted runtime={runtime} collection={collection} />}
  </>;
  if (recorder.state !== undefined && unfinished(recorder.state)) return <Recording alpha={alpha} runtime={runtime} />;
  const available = Notes.readyForNew(state);
  const draftWaiting = Editor.waiting(writing);
  const newNote = { type: "newNote", kind: "Text", available, covered: draftWaiting, folder: state.filter } as const;
  const openTrash = { type: "show", covered: draftWaiting } as const;
  const showPrevious = { type: "show", covered: draftWaiting } as const;
  const importText = { type: "importText", available: available && !draftWaiting } as const;
  const rescueDraft = { type: "rescueDraft", note: writing.note, unreadable: writing.unreadable } as const;
  const reopen = { type: "reopenDraft", covered: false } as const;
  const room = { allowed: mic.state?.mic.grant === "Granted", free: hasMic, front: true, silent: voice.state?.play.status !== "Loading" } as const;
  const canStartRecord = hasMic && (
    recorder.can({ type: "start", room, available, folder: state.filter, covered: draftWaiting }, "Owner")
    || mic.can({ type: "ask", available, folder: state.filter, covered: draftWaiting }, "Owner")
    || mic.can({ type: "openSettings" }, "Owner")
  );
  const shown = Notes.shown(state).filter((item) => item.id !== writing.note || writing.showing || !draftWaiting);
  const row = (entry: Notes.Row) => {
    const note = collection.noteByNumber.get(entry.id);
    if (note === undefined) return null;
    const open = { type: "openRow", id: entry.id, covered: draftWaiting } as const;
    const pin: Notes.Event = { type: "change", c: { ...Notes.nothing, note: entry.id, base: entry.revision, op: entry.pinned ? "Unpin" : "Pin" }, covered: draftWaiting };
    const audio = audioIdOf(note);
    const recNum = audio === "" ? 0 : numberOf("recording", audio);
    const discardRow: Trash.Event = { type: "discard", id: entry.id, revision: entry.revision, recording: recNum, asked: 1, now: untimed, storage: true };
    const moveTargets = [{ id: 0, name: "No folder" }, ...state.folders]
      .filter((folder) => folder.id !== entry.folder)
      .map((folder) => ({ folder, event: { type: "change", c: { ...Notes.nothing, op: "Move", note: entry.id, base: entry.revision, folder: folder.id }, covered: draftWaiting } satisfies Notes.Event }))
      .filter(({ event }) => can(event));
    const canPinRow = can(pin);
    const canDeleteRow = bin.can(discardRow, "Owner");
    const hasRowMenu = canPinRow || moveTargets.length > 0 || canDeleteRow;
    return <div key={entry.id} className="group flex items-start border-b border-border">
      <NoteRow className="min-w-0 flex-1 border-0" title={titleOf(note)} aria-label={`Open ${titleOf(note)}`}
        date={dated(note, collection.readAt)} preview={preview(note)} voice={entry.kind === "Voice"}
        onClick={can(open) ? () => listEvent(open) : undefined} />
      {hasRowMenu && <Menu><MenuTrigger asChild><Button aria-label={`${titleOf(note)} options`} size="icon" variant="ghost" className="mt-1"><Ellipsis /></Button></MenuTrigger>
        <MenuContent align="end">
          {canPinRow && <MenuItem onSelect={() => listEvent(pin)}>{entry.pinned ? "Unpin" : "Pin"}</MenuItem>}
          {moveTargets.map(({ folder, event }) => (
            <MenuItem key={folder.id} onSelect={() => listEvent(event)}>Move to {folder.name}</MenuItem>
          ))}
          {canDeleteRow && <MenuItem destructive onSelect={() => void runtime.runPromise(discardNote(entry.id, entry.revision, recNum))}><Trash2 /> Delete</MenuItem>}
        </MenuContent></Menu>}
    </div>;
  };
  const folder = state.folders.find((item) => item.id === state.filter);
  const folderChange = (op: "AddFolder" | "RenameFolder" | "RemoveFolder", key: number, name: string): Notes.Event =>
    ({ type: "change", c: { ...Notes.nothing, op, folder: key, name, base: state.shelf }, covered: draftWaiting });
  const trimmedFolder = folderName.trim();
  const normalizedTarget = trimmedFolder.normalize("NFKC").toLowerCase();
  const duplicateFolder = form !== undefined && state.folders.some((item) =>
    (form.op !== "RenameFolder" || item.id !== form.folder.id) && item.name.normalize("NFKC").toLowerCase() === normalizedTarget);
  const pendingFolderEvent = form === undefined ? undefined : folderChange(form.op, form.op === "RenameFolder" ? form.folder.id : 0, trimmedFolder);
  const canSubmitFolder = pendingFolderEvent !== undefined && !duplicateFolder && can(pendingFolderEvent);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (pendingFolderEvent === undefined || !canSubmitFolder) return;
    listEvent(pendingFolderEvent);
    setForm(undefined);
    setFolderName("");
    optionsRef.current?.focus({ preventScroll: true });
  };
  const canOpenTrash = bin.can(openTrash, "Owner");
  const canShowPrevious = previous.can(showPrevious, "Owner");
  const canAddFolder = available && can(folderChange("AddFolder", 0, "New"));
  const canRenameFolder = folder !== undefined && available;
  const canRemoveFolder = folder !== undefined && can(folderChange("RemoveFolder", folder.id, ""));
  const canImport = hasDocuments && transfer.can(importText, "Owner");
  const hasOptionsMenu = canOpenTrash || canShowPrevious || canAddFolder || canRenameFolder || canRemoveFolder;
  const pinned = shown.filter((item) => item.pinned);
  const rest = shown.filter((item) => !item.pinned);
  return (
    <section aria-label="Notes" data-alpha-subview="notes-list" className="flex min-h-0 flex-1 flex-col">
      <AppHeader title="Notes" leading={<AppBack alpha={alpha} />}>
        {canStartRecord && <Button size="icon" variant="ghost" aria-label="Record voice note" onClick={() => void runtime.runPromise(record)}><Mic /></Button>}
        {editor.can(newNote, "Owner") && <Button size="icon" variant="ghost" aria-label="New note" onClick={() => void runtime.runPromise(writer.newNote("Text", available, state.filter, draftWaiting))}><Plus /></Button>}
        {hasOptionsMenu && <Menu>
          <MenuTrigger asChild><Button ref={optionsRef} size="icon" variant="ghost" aria-label="Notes options"><Ellipsis /></Button></MenuTrigger>
          <MenuContent align="end">
            {canOpenTrash && <MenuItem onSelect={() => void bin.send(openTrash, "Owner")}><Trash2 /> Recently deleted</MenuItem>}
            {canShowPrevious && <MenuItem onSelect={() => void previous.send(showPrevious, "Owner")}><Folder /> Previous notes</MenuItem>}
            {canAddFolder && <MenuItem onSelect={() => { setForm({ op: "AddFolder" }); setFolderName(""); }}><Folder /> New folder</MenuItem>}
            {canRenameFolder && folder && <MenuItem onSelect={() => { setForm({ op: "RenameFolder", folder }); setFolderName(folder.name); }}>Rename folder</MenuItem>}
            {canRemoveFolder && folder && <MenuItem onSelect={() => listEvent(folderChange("RemoveFolder", folder.id, ""))}>Delete folder</MenuItem>}
          </MenuContent>
        </Menu>}
      </AppHeader>
      <div className="flex min-h-0 flex-col px-4">
        <TransferNotice runtime={runtime} />
        {state.folders.length > 0 && <nav aria-label="Note folders" className="mb-1 flex flex-wrap gap-2 pb-2">
          {state.folders.filter((item) => item.id !== state.filter).map((item) => {
            const filterEvent = { type: "filterBy", folder: item.id } as const;
            return <Chip key={item.id} disabled={!can(filterEvent)} onClick={() => listEvent(filterEvent)}>{item.name}</Chip>;
          })}
        </nav>}
        {form && <form onSubmit={submit} className="flex flex-wrap items-center gap-2 pb-2">
          <Input aria-label="Folder name" className="min-w-32 flex-1" value={folderName} maxLength={40} onChange={(event) => setFolderName(event.currentTarget.value)} autoFocus />
          <Button type="submit" disabled={!canSubmitFolder}>Save</Button>
          <Button type="button" variant="ghost" onClick={() => { setForm(undefined); optionsRef.current?.focus({ preventScroll: true }); }}>Cancel</Button>
        </form>}
        {draftWaiting && !writing.showing && <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md bg-muted p-2">
          <span className="mr-auto text-sm">{writing.unreadable ? "The unsaved draft could not be read back" : `Unsaved ${draft?.title.trim() || "note"}`}</span>
          {writing.unreadable && hasDocuments && transfer.can(rescueDraft, "Owner") && <Button size="sm" onClick={() => void transfer.send(rescueDraft, "Owner")}>Save out draft</Button>}
          {editor.can({ type: "askDrop" }, "Owner") && <Button size="sm" variant="secondary" onClick={() => void editor.send({ type: "askDrop" }, "Owner")}>Discard draft</Button>}
          {writing.dropping && editor.can({ type: "cancelDrop" }, "Owner") && <Button size="sm" variant="secondary" onClick={() => void editor.send({ type: "cancelDrop" }, "Owner")}>Keep draft</Button>}
          {editor.can({ type: "dropDraft" }, "Owner") && <Button size="sm" variant="destructive" onClick={() => void runtime.runPromise(writer.discard())}>Discard permanently</Button>}
          {editor.can(reopen, "Owner") && <Button size="sm" onClick={() => void editor.send(reopen, "Owner")}>Reopen</Button>}
          {editor.can({ type: "discardDraft" }, "Owner") && <Button size="sm" variant="secondary" onClick={() => void runtime.runPromise(writer.discard())}>Discard</Button>}
        </div>}
        {state.writing.outcome === "Unknown" && <Alert variant="warn" className="mb-2">Alpha couldn't confirm the last change</Alert>}
        {state.writing.outcome === "Refused" && <Alert variant="warn" className="mb-2">The note or folder couldn't be changed</Alert>}
      </div>
      <NoteRows
        state={state.read.status === "Failed" || state.owner === 0 ? "unavailable" : state.read.status === "Loaded" || state.rows.length > 0 ? "listed" : "loading"}
        message="Notes unavailable"
        pinned={pinned.map(row)}
        others={rest.map(row)}
        filter={folder?.name}
        onClearFilter={can({ type: "clearFilter" }) ? () => listEvent({ type: "clearFilter" }) : undefined}
        onRetry={can({ type: "refresh" }) ? () => void runtime.runPromise(enter()) : undefined}
      />
      {canImport && (
        <div className={cn("px-4 pt-2", dockClearance)}>
          <Button variant="secondary" onClick={() => void transfer.send(importText, "Owner")}><FileDown /> Import</Button>
        </div>
      )}
    </section>
  );
}

/** @model spec/app/notes/index.md */
export function NotesScreen({ alpha, runtime }: { readonly alpha: Alpha; readonly runtime: Runtime }) {
  const notes = useNotes(runtime);
  if (notes.cause) return <Alert variant="destructive" className="m-4">Alpha couldn't open Notes</Alert>;
  if (notes.state === undefined) return null;
  return <NotesList alpha={alpha} runtime={runtime} />;
}
