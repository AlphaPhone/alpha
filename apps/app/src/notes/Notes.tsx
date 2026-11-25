// spec/app/notes/index.md, "Story: See my notes"; spec/app/notes/index.md, "Story: Organise my notes"; spec/app/notes/editor.md, "Story: Write a note"; spec/app/notes/trash.md, "Story: Delete a note and get it back"
import { Alert, AppHeader, Button, Input, LinkNoteView, Menu, MenuContent, MenuItem, MenuTrigger, NoteEditor as NoteForm, NoteRow, NotesList as NoteRows, VoiceNoteView } from "@repo/ui";
import { Effect } from "effect";
import { Download, Ellipsis, Folder, FolderInput, Mail, MessageSquare, Mic, Pin, Plus, Trash2 } from "lucide-react";
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
import type { Alpha } from "../runtime/area.tsx";
import { AppBack } from "../shell/AppBack.tsx";
import { type Collection, type DraftWords, NoteContent, audioIdOf, hasContent } from "./content.vibe";
import { type Fields, NoteEditor } from "./editor.vibe";
import { enter } from "./notes.vibe";
import { record } from "./recording.vibe";
import { Previous } from "./Previous.tsx";
import { clock, dated, preview, titleOf } from "./present.ts";
import { Recording } from "./Recording.tsx";
import { RecentlyDeleted } from "./RecentlyDeleted.tsx";
import { pageOf } from "./sides.vibe";

type Runtime = Alpha["runtime"];
type Form = { readonly op: "AddFolder" } | { readonly op: "RenameFolder"; readonly folder: Notes.Folder };

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
  const list = useNotes(runtime);
  const bin = useTrash(runtime).state;
  const transfer = useTransfer(runtime);
  const hasDocuments = runtime.runSync(NoteDocuments).available;
  const writer = runtime.runSync(NoteEditor);
  const [next, setNext] = useState("");
  const current = writing.state;
  if (!current?.showing) return null;
  const owner = (event: Editor.Event) => writing.can(event, "Owner");
  const send = (event: Editor.Event) => void writing.send(event, "Owner");
  const edit = (fields: Partial<Fields>) => void runtime.runPromise(writer.typed(fields));
  const action = (kind: "close" | "save" | "takeSaved" | "keepMine" | "keepAsNew") =>
    void runtime.runPromise(writer[kind]());
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
  const entry = list.state === undefined ? undefined : Notes.shown(list.state).find((row) => row.id === current.note);
  const organise = (event: Notes.Event) => list.can(event, "Owner") ? () => void list.send(event, "Owner") : undefined;
  const pin = entry && organise({ type: "change", c: { ...Notes.nothing, note: entry.id, base: entry.revision, op: entry.pinned ? "Unpin" : "Pin" }, covered: false });
  const moves = entry === undefined || list.state === undefined ? [] : [{ id: 0, name: "No folder" }, ...list.state.folders].flatMap((folder) => {
    const move = folder.id === entry.folder ? undefined : organise({ type: "change", c: { ...Notes.nothing, op: "Move", note: entry.id, base: entry.revision, folder: folder.id }, covered: false });
    return move ? [{ folder, move }] : [];
  });
  const menu = (deletable || exportable || shared || pin || moves.length > 0) && <Menu onOpenChange={(open) => {
    if (open && actions.can(sharing, "Owner")) void actions.send(sharing, "Owner");
    if (!open && actions.can({ type: "closeMenu" }, "Owner")) void actions.send({ type: "closeMenu" }, "Owner");
  }}>
    <MenuTrigger asChild><Button aria-label="Note actions" size="icon" variant="ghost"><Ellipsis /></Button></MenuTrigger>
    <MenuContent align="end">
      {shared && actions.state?.open && <>
        <MenuItem onSelect={() => void actions.send({ type: "share", channel: "Email", mark: 0 }, "Owner")}><Mail /> Share by email</MenuItem>
        <MenuItem onSelect={() => void actions.send({ type: "share", channel: "Messages", mark: 0 }, "Owner")}><MessageSquare /> Share in Messages</MenuItem>
      </>}
      {pin && <MenuItem onSelect={pin}><Pin /> {entry?.pinned ? "Unpin" : "Pin"}</MenuItem>}
      {moves.map(({ folder, move }) => <MenuItem key={folder.id} onSelect={move}><FolderInput /> {folder.id === 0 ? "Move out of folder" : `Move to ${folder.name}`}</MenuItem>)}
      {exportable && <MenuItem onSelect={() => void transfer.send(exporting, "Owner")}><Download /> Save as text</MenuItem>}
      {deletable && <><div role="separator" className="my-1 border-t border-border" /><MenuItem destructive onSelect={() => send(deletion)}><Trash2 /> Delete</MenuItem></>}
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
  const hasDocuments = runtime.runSync(NoteDocuments).available;
  const hasMic = runtime.runSync(NoteDevice).available;
  const writer = runtime.runSync(NoteEditor);
  const content = runtime.runSync(NoteContent);
  const data = useSyncExternalStore(content.subscribe, content.snapshot, content.snapshot);
  const [form, setForm] = useState<Form>();
  const [folderName, setFolderName] = useState("");
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
    <EditorScreen key={writing.note} runtime={runtime} saved={draft} />
    {bin.state?.question === "AskFull" && <RecentlyDeleted runtime={runtime} collection={collection} />}
  </>;
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
  const row = (entry: Notes.Row) => {
    const note = collection.noteByNumber.get(entry.id);
    if (note === undefined) return null;
    const open = { type: "openRow", id: entry.id, covered: Editor.waiting(writing) } as const;
    return <NoteRow key={entry.id} className="[contain-intrinsic-size:auto_4rem] [content-visibility:auto]" title={titleOf(note)} aria-label={`Open ${titleOf(note)}`}
      date={dated(note, collection.readAt)} preview={preview(note)} voice={entry.kind === "Voice"}
      onClick={canOpen ? () => listEvent(open) : undefined} />;
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
        {available && hasMic && !Editor.waiting(writing) && <Button size="icon" variant="ghost" aria-label="Record voice note" onClick={() => void runtime.runPromise(record)}><Mic className="size-5" /></Button>}
        {editor.can(newNote, "Owner") && <Button size="icon" variant="ghost" aria-label="New note" onClick={() => void runtime.runPromise(writer.newNote("Text", available, state.filter, false))}><Plus className="size-5" /></Button>}
        {bin.can(openTrash, "Owner") && <Menu>
          <MenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Notes options"><Ellipsis /></Button></MenuTrigger>
          <MenuContent align="end">
            <MenuItem onSelect={() => void bin.send(openTrash, "Owner")}><Trash2 /> Recently deleted</MenuItem>
            {previous.can(showPrevious, "Owner") && <MenuItem onSelect={() => void previous.send(showPrevious, "Owner")}><Folder /> On this phone</MenuItem>}
            {state.folders.filter((item) => item.id !== state.filter).map((item) => <MenuItem key={item.id} onSelect={() => listEvent({ type: "filterBy", folder: item.id })}><Folder /> {item.name}</MenuItem>)}
            {available && <MenuItem onSelect={() => { setForm({ op: "AddFolder" }); setFolderName(""); }}><Plus /> New folder</MenuItem>}
            {folder && <MenuItem onSelect={() => { setForm({ op: "RenameFolder", folder }); setFolderName(folder.name); }}>Rename folder</MenuItem>}
            {folder && can(folderChange("RemoveFolder", folder.id, "")) && <MenuItem onSelect={() => listEvent(folderChange("RemoveFolder", folder.id, ""))}>Delete folder</MenuItem>}
          </MenuContent>
        </Menu>}
      </AppHeader>
      <div className="flex min-h-0 flex-col px-4">
        <TransferNotice runtime={runtime} />
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
          {editor.can({ type: "dropDraft" }, "Owner") && <Button size="sm" variant="destructive" onClick={() => void runtime.runPromise(writer.discard())}>Discard permanently</Button>}
          {editor.can(reopen, "Owner") && <Button size="sm" onClick={() => void editor.send(reopen, "Owner")}>Reopen</Button>}
          {editor.can({ type: "discardDraft" }, "Owner") && <Button size="sm" variant="secondary" onClick={() => void runtime.runPromise(writer.discard())}>Discard</Button>}
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
      {hasDocuments && transfer.can(importText, "Owner") && <Button size="sm" aria-label="Import text note" className="mb-5 ml-4 h-12 self-start px-3.5 text-sm font-normal" variant="secondary" onClick={() => void transfer.send(importText, "Owner")}><Download /> Import</Button>}
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
