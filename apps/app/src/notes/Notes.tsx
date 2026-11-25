// spec/app/notes/index.md, "Story: See my notes"; spec/app/notes/index.md, "Story: Organise my notes"; spec/app/notes/editor.md, "Story: Write a note"; spec/app/notes/trash.md, "Story: Delete a note and get it back"
import { Alert, AppHeader, Button, Chip, EmptyState, Input, LinkNoteView, Menu, MenuContent, MenuItem, MenuTrigger, NoteEditor as NoteForm, NoteRow, NotesList as NoteRows, Spinner, VoiceNoteView } from "@repo/ui";
import { ArrowLeft, Ellipsis, FileDown, Folder, Mail, MessageSquare, Mic, Plus, Trash2 } from "lucide-react";
import { Effect } from "effect";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import * as Notes from "../../gen/app__notes.ts";
import * as Editor from "../../gen/app__notes__editor.ts";
import * as Trash from "../../gen/app__notes__trash.ts";
import { useMachine as useActions } from "../../gen/app__notes__actions.react.ts";
import { useMachine as useNotes } from "../../gen/app__notes.react.ts";
import { useMachine as useEditor } from "../../gen/app__notes__editor.react.ts";
import { useMachine as useTrash } from "../../gen/app__notes__trash.react.ts";
import { useMachine as useLink } from "../../gen/app__notes__linkNote.react.ts";
import { useMachine as useRecorder } from "../../gen/app__notes__recording.react.ts";
import { useMachine as usePrevious } from "../../gen/app__notes__previous.react.ts";
import { useMachine as useTransfer } from "../../gen/app__notes__transfer.react.ts";
import { useMachine as useVoice } from "../../gen/app__notes__voice.react.ts";
import { NoteDocuments } from "../platform/noteDocuments.vibe";
import { NoteDevice } from "../platform/noteDevice.vibe";
import { unfinished } from "../../gen/app__notes__recording.ts";
import type { Alpha, Resident } from "../runtime/area.tsx";
import { untimed } from "../runtime/reactor.vibe";
import { useTimed } from "../runtime/react.ts";
import { AppBack } from "../shell/AppBack.tsx";
import { type Collection, type DraftWords, NoteContent, audioIdOf, hasContent, numberOf } from "./content.vibe";
import { type Fields, NoteEditor } from "./editor.vibe";
import { enter } from "./notes.vibe";
import { record } from "./recording.vibe";
import { Previous } from "./Previous.tsx";
import { clock, dated, preview } from "./present.ts";
import { Recording } from "./Recording.tsx";
import { pageOf } from "./sides.vibe";

type Runtime = Alpha["runtime"];
type Form = { readonly op: "AddFolder" } | { readonly op: "RenameFolder"; readonly folder: Notes.Folder };
const titleOf = (note: Collection["noteByNumber"] extends ReadonlyMap<number, infer T> ? T : never) => note.title.trim() || "Untitled";

const transferNotices = {
  Done: "Saved.",
  NotDone: "The file couldn't be saved.",
  Unsure: "Alpha couldn't confirm the file. Check it before trying again.",
  NoAccess: "The selected file couldn't be accessed.",
  Unread: "This file must contain readable text.",
} as const;

function TransferNotice({ runtime }: { readonly runtime: Runtime }) {
  const transfer = useTransfer(runtime);
  const notice = transfer.state?.notice;
  if (notice === undefined || notice === "Quiet") return null;
  const dismiss = { type: "dismiss" } as const;
  return <Alert variant={notice === "Done" ? "info" : "warn"}>
    {transferNotices[notice]}
    {transfer.can(dismiss, "Owner") && <Button size="sm" variant="ghost" onClick={() => void transfer.send(dismiss, "Owner")}>Dismiss</Button>}
  </Alert>;
}

function EditorScreen({ runtime, saved }: { readonly runtime: Runtime; readonly saved: DraftWords }) {
  const writing = useEditor(runtime);
  const actions = useActions(runtime);
  const bin = useTrash(runtime).state;
  const transfer = useTransfer(runtime);
  const hasDocuments = runtime.runSync(NoteDocuments.use((device) => Effect.succeed(device.available)));
  const [next, setNext] = useState("");
  const current = writing.state;
  if (!current?.showing) return null;
  const owner = (event: Editor.Event) => writing.can(event, "Owner");
  const send = (event: Editor.Event) => void writing.send(event, "Owner");
  const edit = (fields: Partial<Fields>) => void runtime.runPromise(NoteEditor.use((writer) => writer.typed(fields)));
  const action = (kind: "close" | "save" | "takeSaved" | "keepMine" | "keepAsNew") =>
    void runtime.runPromise(NoteEditor.use((writer) => writer[kind]()));
  const close = owner({ type: "close" }) ? () => action("close") : undefined;
  const checklist = saved.kind === "Checklist";
  const deletion: Editor.Event = { type: "deleteNote", ready: bin !== undefined && Trash.ready(bin) };
  const deletable = owner(deletion);
  const exporting = { type: "exportNote", note: current.note, revision: current.draft.base } as const;
  const sharing = { type: "openMenu", note: current.note, link: current.link, saved: current.draft.sync === "Kept" && !current.deleting } as const;
  const shared = sharing.saved && current.link.tie === "NoLink" && (actions.can(sharing, "Owner") || actions.state?.open === true);
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
        <MenuItem onSelect={() => void actions.send({ type: "share", channel: "Email", mark: 0 }, "Owner")}><Mail /> Share by email</MenuItem>
        <MenuItem onSelect={() => void actions.send({ type: "share", channel: "Messages", mark: 0 }, "Owner")}><MessageSquare /> Share in Messages</MenuItem>
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
      items={saved.items.map((item, index) => ({ key: `${saved.creation}:${index}`, text: item.t, done: item.done }))}
      next={next}
      locked={!editable}
      status={status}
      menu={menu}
      onTitle={(title) => edit({ title: title.slice(0, 240) })}
      onBody={(body) => edit({ body: body.slice(0, 20_000) })}
      onItem={(index, item) => edit({ items: saved.items.map((old, at) => at === index ? { t: item.text, done: item.done } : old) })}
      onRemoveItem={(index) => edit({ items: saved.items.filter((_, at) => at !== index) })}
      onNext={setNext}
      onAddItem={() => { if (next.trim() !== "") { edit({ items: [...saved.items, { t: next.trim(), done: false }] }); setNext(""); } }}
      onFormat={editable ? () => edit(checklist ? { kind: "Text", body: saved.items.map((row) => row.t).join("\n") }
        : { kind: "Checklist", items: saved.body.split("\n").filter((line) => line.trim() !== "").map((t) => ({ t, done: false })), body: "" }) : undefined}
      onBack={close}
      onDone={close}
      feedback={<>
        <TransferNotice runtime={runtime} />
        {current.draft.sync === "Conflicted" && <Alert variant="warn">This note changed while you were writing.
          <div className="mt-2 flex flex-wrap gap-2">
            {owner({ type: "keepMine" }) && <Button size="sm" onClick={() => action("keepMine")}>Keep mine</Button>}
            {owner({ type: "takeSaved" }) && <Button size="sm" variant="secondary" onClick={() => action("takeSaved")}>Use saved note</Button>}
          </div>
        </Alert>}
        {current.gone && <Alert variant="warn">This note was deleted while you were writing.
          {owner({ type: "keepAsNew" }) && <Button size="sm" onClick={() => action("keepAsNew")}>Keep as a new note</Button>}
        </Alert>}
        {current.failed && owner({ type: "save" }) && hasContent(saved) && <Button className="self-start" size="sm" onClick={() => action("save")}>Try again</Button>}
      </>}
    />
  );
}

function TrashScreen({ runtime, collection }: { readonly runtime: Runtime; readonly collection: Collection }) {
  const model = useTimed(runtime, useTrash);
  const state = model.state;
  if (!state?.showing && state?.question !== "AskFull") return null;
  const owner = (event: Trash.Event) => model.can(event, "Owner");
  const send = (event: Trash.Event) => void model.send(event, "Owner");
  const opened = collection.trash.find((item) => numberOf("note", item.note.id) === state.opened);
  return (
    <section aria-label="Recently deleted" className="flex min-h-0 flex-1 flex-col">
      <AppHeader title="Recently deleted" detail leading={<Button size="icon" variant="ghost" aria-label="Back to notes" onClick={() => send({ type: "back" })}><ArrowLeft /></Button>}>
        {owner({ type: "askEmpty" }) && <Button variant="ghost" onClick={() => send({ type: "askEmpty" })}>Delete all</Button>}
      </AppHeader>
      <div className="flex flex-col gap-3 px-6">
        {state.read.status === "Loading" && <Spinner label="Reading deleted notes" />}
        {state.read.status === "Failed" && <Alert variant="warn">Recently deleted is unavailable</Alert>}
        {state.failed && <Alert variant="warn">Couldn't change Recently deleted</Alert>}
        {state.unsure && <Alert variant="warn">Alpha couldn't confirm the last change</Alert>}
        {state.read.status === "Loaded" && state.entries.length === 0 && <EmptyState title="No recently deleted notes" />}
        {state.question !== "NoQuestion" && <Alert variant="warn">
          {state.question === "AskFull" ? "Recently deleted is full." : state.question === "AskEmpty" ? "Permanently delete every note in Recently deleted?" : "Permanently delete this note?"}
          <div className="mt-2 flex gap-2">
            {owner({ type: "cancel" }) && <Button variant="secondary" onClick={() => send({ type: "cancel" })}>Cancel</Button>}
            {state.question !== "AskFull" && owner({ type: "confirm", now: untimed, storage: true }) && <Button variant="destructive" onClick={() => send({ type: "confirm", now: untimed, storage: true })}>Delete forever</Button>}
          </div>
        </Alert>}
        {opened ? <article className="pb-4"><h2 className="font-display text-2xl">{titleOf(opened.note)}</h2><p className="whitespace-pre-wrap">{opened.note.body}</p></article> : state.entries.map((entry) => {
          const saved = collection.trash.find((row) => numberOf("note", row.note.id) === entry.id);
          if (saved === undefined) return null;
          const view = { type: "openEntry", id: entry.id } as const;
          const recover = { type: "recover", id: entry.id, now: untimed, storage: true } as const;
          const erase = { type: "askErase", id: entry.id } as const;
          return <div className="flex flex-wrap items-center gap-2 border-b py-2" key={entry.id}>
            <Button variant="ghost" className="mr-auto" disabled={!owner(view)} onClick={() => send(view)}>{titleOf(saved.note)}</Button>
            {owner(recover) && <Button size="sm" variant="secondary" onClick={() => send(recover)}>Recover</Button>}
            {owner(erase) && <Button size="icon" variant="ghost" aria-label={`Delete ${titleOf(saved.note)} forever`} onClick={() => send(erase)}><Trash2 /></Button>}
          </div>;
        })}
      </div>
    </section>
  );
}

function LinkedNote({ runtime, collection }: { readonly runtime: Runtime; readonly collection: Collection }) {
  const link = useLink(runtime);
  const state = link.state;
  if (!state?.showing) return null;
  const note = collection.noteByNumber.get(state.note);
  const data = note?.format?.data;
  const page = pageOf(data?.url);
  const event = { type: "visit", mark: state.link.mark } as const;
  const close = () => void link.send({ type: "back" }, "Owner");
  const askRemove = { type: "askRemove" } as const;
  const confirmRemove = { type: "confirmRemove" } as const;
  const clips = Array.isArray(data?.clips) ? data.clips.filter((part): part is string => typeof part === "string") : [];
  if (clips.length === 0 && note?.body.trim()) clips.push(note.body);
  return <LinkNoteView
    className="relative inset-auto flex-1"
    title={note === undefined ? "Link note" : titleOf(note)}
    domain={typeof data?.domain === "string" ? data.domain : URL.parse(page)?.hostname ?? ""}
    clips={clips}
    onBack={close}
    onVisit={page !== "" && link.can(event, "Owner") ? () => void link.send(event, "Owner") : undefined}
    menu={link.can(askRemove, "Owner") && <Menu>
      <MenuTrigger asChild><Button aria-label="Link actions" size="icon" variant="ghost"><Ellipsis /></Button></MenuTrigger>
      <MenuContent><MenuItem destructive onSelect={() => void link.send(askRemove, "Owner")}>Remove source</MenuItem></MenuContent>
    </Menu>}
    feedback={state.review.showing && <Alert variant="warn" className="mt-4">Remove the web source from this note?
      <div className="mt-2 flex gap-2">
        <Button variant="secondary" onClick={close}>Cancel</Button>
        {link.can(confirmRemove, "Owner") && <Button variant="destructive" onClick={() => void link.send(confirmRemove, "Owner")}>Remove</Button>}
      </div>
    </Alert>}
  />;
}

function speaker(value: unknown) {
  const words = typeof value === "string" ? value.trim().split(/\s+/).filter(Boolean) : [];
  if (words.length === 0 || value === "me") return { initials: "You", who: "You", own: true };
  return { initials: words.map((word) => word[0]).join("").slice(0, 2).toUpperCase(), who: words[0] ?? "", own: false };
}

function VoiceNote({ runtime, collection }: { readonly runtime: Runtime; readonly collection: Collection }) {
  const voice = useVoice(runtime);
  const audio = runtime.runSync(NoteDevice.use((device) => Effect.succeed(device.available)));
  const state = voice.state;
  if (!state?.showing) return null;
  const note = collection.noteByNumber.get(state.note);
  const data = note?.format?.data;
  const lines = Array.isArray(data?.lines) ? data.lines.flatMap((line) => typeof line === "object" && line !== null && "t" in line && typeof line.t === "string"
    ? [{ ...speaker("s" in line ? line.s : undefined), at: clock("at" in line && typeof line.at === "number" ? line.at : 0), text: line.t }] : []) : [];
  const summary = Array.isArray(data?.summary) ? data.summary.filter((line): line is string => typeof line === "string") : [];
  const actions = Array.isArray(data?.actions) ? data.actions.flatMap((item) => typeof item === "object" && item !== null && "t" in item && typeof item.t === "string"
    ? [{ text: item.t, done: "done" in item && item.done === true }] : []) : [];
  const savedAudio = data?.audio;
  const ms = typeof data?.durationMs === "number" ? data.durationMs : typeof savedAudio === "object" && savedAudio !== null
    && "durationMs" in savedAudio && typeof savedAudio.durationMs === "number" ? savedAudio.durationMs : undefined;
  const length = ms === undefined ? "" : clock(ms / 1000);
  const play = { type: "play", from: 0 } as const;
  const stop = { type: "stopPlaying" } as const;
  const canPlay = audio && note !== undefined && audioIdOf(note) !== "" && voice.can(play, "Owner");
  const playback = voice.can(stop, "Owner") ? () => void voice.send(stop, "Owner") : canPlay ? () => void voice.send(play, "Owner") : undefined;
  return <VoiceNoteView
    className="relative inset-auto flex-1"
    title={note === undefined ? "Voice note" : titleOf(note)}
    meta={note === undefined ? "" : [dated(note, collection.readAt), length].filter(Boolean).join(" · ")}
    time={length}
    summary={summary}
    actions={actions}
    lines={lines.length === 0 && note?.body ? [{ ...speaker(undefined), at: "0:00", text: note.body }] : lines}
    playing={state.play.status === "Loading"}
    onBack={() => void voice.send({ type: "back" }, "Owner")}
    onPlay={playback}
    onSeek={canPlay && Array.isArray(data?.segments) && data.segments.length > 0 ? (from) => {
      const event = { type: "play", from } as const;
      if (voice.can(event, "Owner")) void voice.send(event, "Owner");
    } : undefined}
    feedback={state.play.status === "Failed" && <Alert variant="warn" className="mt-4">This recording couldn't be played</Alert>}
  />;
}

function NotesList({ alpha, runtime }: { readonly alpha: Alpha; readonly runtime: Runtime }) {
  const list = useNotes(runtime);
  const editor = useEditor(runtime);
  const links = useLink(runtime);
  const voice = useVoice(runtime);
  const bin = useTrash(runtime);
  const recorder = useRecorder(runtime).state;
  const previous = usePrevious(runtime);
  const transfer = useTransfer(runtime);
  const hasDocuments = runtime.runSync(NoteDocuments.use((device) => Effect.succeed(device.available)));
  const hasMic = runtime.runSync(NoteDevice.use((device) => Effect.succeed(device.available)));
  const content = runtime.runSync(NoteContent.use((read) => Effect.succeed(read)));
  const data = useSyncExternalStore((listener) => content.subscribe(listener), () => content.snapshot(), () => content.snapshot());
  const [form, setForm] = useState<Form>();
  const [folderName, setFolderName] = useState("");
  const state = list.state;
  const writing = editor.state;
  if (state === undefined || writing === undefined) return null;
  const { collection, draft } = data;
  const listEvent = (event: Notes.Event) => void list.send(event, "Owner");
  const can = (event: Notes.Event) => list.can(event, "Owner");
  if (previous.state?.showing) return <Previous runtime={runtime} />;
  if (bin.state?.showing || bin.state?.question === "AskFull") return <TrashScreen runtime={runtime} collection={collection} />;
  if (links.state?.showing) return <LinkedNote runtime={runtime} collection={collection} />;
  if (voice.state?.showing) return <VoiceNote runtime={runtime} collection={collection} />;
  if (writing.showing && draft !== undefined) return <EditorScreen runtime={runtime} saved={draft} />;
  if (recorder !== undefined && unfinished(recorder)) return <Recording alpha={alpha} runtime={runtime} />;
  const available = Notes.readyForNew(state);
  const newNote = { type: "newNote", kind: "Text", available, covered: false, folder: state.filter } as const;
  const openTrash = { type: "show", covered: false } as const;
  const showPrevious = { type: "show", covered: false } as const;
  const importText = { type: "importText", available: available && !Editor.waiting(writing) } as const;
  const rescueDraft = { type: "rescueDraft", note: writing.note, unreadable: writing.unreadable } as const;
  const reopen = { type: "reopenDraft", covered: false } as const;
  const shown = Notes.shown(state).filter((item) => item.id !== writing.note || writing.showing || !Editor.waiting(writing));
  const first = shown[0];
  const canOpen = first !== undefined && can({ type: "openRow", id: first.id, covered: Editor.waiting(writing) });
  const canOrganize = Notes.mayWrite(state, false);
  const row = (entry: Notes.Row) => {
    const note = collection.noteByNumber.get(entry.id);
    if (note === undefined) return null;
    const open = { type: "openRow", id: entry.id, covered: Editor.waiting(writing) } as const;
    const pin: Notes.Event = { type: "change", c: { ...Notes.nothing, note: entry.id, base: entry.revision, op: entry.pinned ? "Unpin" : "Pin" }, covered: false };
    return <div key={entry.id} className="group flex items-start border-b border-border [contain-intrinsic-size:auto_4rem] [content-visibility:auto]">
      <NoteRow className="min-w-0 flex-1 border-0" title={titleOf(note)} aria-label={`Open ${titleOf(note)}`}
        date={dated(note, collection.readAt)} preview={preview(note)} voice={entry.kind === "Voice"}
        onClick={canOpen ? () => listEvent(open) : undefined} />
      {canOrganize && <Menu><MenuTrigger asChild><Button aria-label={`${titleOf(note)} options`} size="icon" variant="ghost" className="mt-1"><Ellipsis /></Button></MenuTrigger>
        <MenuContent align="end">
          <MenuItem onSelect={() => listEvent(pin)}>{entry.pinned ? "Unpin" : "Pin"}</MenuItem>
          {[{ id: 0, name: "No folder" }, ...state.folders].map((folder) => {
            const move: Notes.Event = { type: "change", c: { ...Notes.nothing, op: "Move", note: entry.id, base: entry.revision, folder: folder.id }, covered: false };
            return folder.id !== entry.folder && <MenuItem key={folder.id} onSelect={() => listEvent(move)}>Move to {folder.name}</MenuItem>;
          })}
        </MenuContent></Menu>}
    </div>;
  };
  const folder = state.folders.find((item) => item.id === state.filter);
  const folderChange = (op: "AddFolder" | "RenameFolder" | "RemoveFolder", key: number, name: string): Notes.Event =>
    ({ type: "change", c: { ...Notes.nothing, op, folder: key, name, base: state.shelf }, covered: false });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (form === undefined) return;
    const changed = folderChange(form.op, form.op === "RenameFolder" ? form.folder.id : 0, folderName.trim());
    if (can(changed)) { listEvent(changed); setForm(undefined); setFolderName(""); }
  };
  const pinned = shown.filter((item) => item.pinned);
  const rest = shown.filter((item) => !item.pinned);
  return (
    <section aria-label="Notes" data-alpha-subview="notes-list" className="flex min-h-0 flex-1 flex-col">
      <AppHeader title="Notes" leading={<AppBack alpha={alpha} />}>
        {available && hasMic && !Editor.waiting(writing) && <Button size="icon" variant="ghost" aria-label="Record voice note" onClick={() => void runtime.runPromise(record)}><Mic /></Button>}
        {editor.can(newNote, "Owner") && <Button size="icon" variant="ghost" aria-label="New note" onClick={() => void runtime.runPromise(NoteEditor.use((writer) => writer.newNote("Text", available, state.filter, false)))}><Plus /></Button>}
        {bin.can(openTrash, "Owner") && <Menu>
          <MenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Notes options"><Ellipsis /></Button></MenuTrigger>
          <MenuContent align="end">
            <MenuItem onSelect={() => void bin.send(openTrash, "Owner")}><Trash2 /> Recently deleted</MenuItem>
            {previous.can(showPrevious, "Owner") && <MenuItem onSelect={() => void previous.send(showPrevious, "Owner")}><Folder /> On this phone</MenuItem>}
            {available && <MenuItem onSelect={() => { setForm({ op: "AddFolder" }); setFolderName(""); }}><Folder /> New folder</MenuItem>}
            {folder && <MenuItem onSelect={() => { setForm({ op: "RenameFolder", folder }); setFolderName(folder.name); }}>Rename folder</MenuItem>}
            {folder && can(folderChange("RemoveFolder", folder.id, "")) && <MenuItem onSelect={() => listEvent(folderChange("RemoveFolder", folder.id, ""))}>Delete folder</MenuItem>}
          </MenuContent>
        </Menu>}
      </AppHeader>
      <div className="flex min-h-0 flex-col px-4">
        <TransferNotice runtime={runtime} />
        {state.folders.length > 0 && <nav aria-label="Note folders" className="flex flex-wrap gap-2 pb-2">
          {state.folders.filter((item) => item.id !== state.filter).map((item) => <Chip key={item.id} onClick={() => listEvent({ type: "filterBy", folder: item.id })}>{item.name}</Chip>)}
        </nav>}
        {form && <form onSubmit={submit} className="flex flex-wrap items-center gap-2 pb-2">
          <Input aria-label="Folder name" className="min-w-32 flex-1" value={folderName} maxLength={40} onChange={(event) => setFolderName(event.currentTarget.value)} autoFocus />
          <Button type="submit" disabled={!can(folderChange(form.op, form.op === "RenameFolder" ? form.folder.id : 0, folderName.trim()))}>Save</Button>
          <Button type="button" variant="ghost" onClick={() => setForm(undefined)}>Cancel</Button>
        </form>}
        {Editor.waiting(writing) && !writing.showing && <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md bg-muted p-2">
          <span className="mr-auto text-sm">{writing.unreadable ? "The unsaved draft could not be read back" : `Unsaved ${draft?.title.trim() || "note"}`}</span>
          {writing.unreadable && hasDocuments && transfer.can(rescueDraft, "Owner") && <Button size="sm" onClick={() => void transfer.send(rescueDraft, "Owner")}>Save out draft</Button>}
          {editor.can({ type: "askDrop" }, "Owner") && <Button size="sm" variant="secondary" onClick={() => void editor.send({ type: "askDrop" }, "Owner")}>Discard draft</Button>}
          {writing.dropping && editor.can({ type: "cancelDrop" }, "Owner") && <Button size="sm" variant="secondary" onClick={() => void editor.send({ type: "cancelDrop" }, "Owner")}>Keep draft</Button>}
          {editor.can({ type: "dropDraft" }, "Owner") && <Button size="sm" variant="destructive" onClick={() => void runtime.runPromise(NoteEditor.use((writer) => writer.discard()))}>Discard permanently</Button>}
          {editor.can(reopen, "Owner") && <Button size="sm" onClick={() => void editor.send(reopen, "Owner")}>Reopen</Button>}
          {editor.can({ type: "discardDraft" }, "Owner") && <Button size="sm" variant="secondary" onClick={() => void runtime.runPromise(NoteEditor.use((writer) => writer.discard()))}>Discard</Button>}
        </div>}
        {state.writing.outcome === "Unknown" && <Alert variant="warn">Alpha couldn't confirm the last change</Alert>}
        {state.writing.outcome === "Refused" && <Alert variant="warn">The note or folder couldn't be changed</Alert>}
      </div>
      <NoteRows
        state={state.read.status === "Failed" || state.owner === 0 ? "unavailable" : state.read.status === "Loaded" || state.rows.length > 0 ? "listed" : "loading"}
        message="Notes unavailable"
        pinned={pinned.map(row)}
        others={rest.map(row)}
        filter={folder?.name}
        onClearFilter={can({ type: "clearFilter" }) ? () => listEvent({ type: "clearFilter" }) : undefined}
        onRetry={() => void runtime.runPromise(enter())}
      />
      {hasDocuments && transfer.can(importText, "Owner") && <Button className="mb-5 ml-4 self-start" variant="secondary" onClick={() => void transfer.send(importText, "Owner")}><FileDown /> Import</Button>}
    </section>
  );
}

/** @model spec/app/notes/index.md */
export function NotesScreen({ alpha, runtime }: { readonly alpha: Alpha; readonly runtime: import("effect").ManagedRuntime.ManagedRuntime<Resident, unknown> }) {
  const notes = useNotes(runtime);
  if (notes.cause) return <Alert variant="destructive" className="m-4">Alpha couldn't open Notes</Alert>;
  if (notes.state === undefined) return null;
  return <NotesList alpha={alpha} runtime={runtime} />;
}
