// spec/app/notes/index.md, "Story: See my notes"; spec/app/notes/index.md, "Story: Organise my notes"; spec/app/notes/editor.md, "Story: Write a note"; spec/app/notes/trash.md, "Story: Delete a note and get it back"
import { Alert, AppHeader, Button, Checkbox, Chip, EmptyState, Input, Menu, MenuContent, MenuItem, MenuTrigger, NoteRow, NotesList as NoteRows, Spinner, Textarea } from "@repo/ui";
import { ArrowLeft, AudioLines, Ellipsis, FileDown, Folder, ListChecks, Mic, Plus, Trash2, X } from "lucide-react";
import { Effect } from "effect";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import * as Notes from "../../gen/app__notes.ts";
import * as Editor from "../../gen/app__notes__editor.ts";
import * as Trash from "../../gen/app__notes__trash.ts";
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
import { type Collection, type DraftWords, NoteContent, hasContent, numberOf } from "./content.vibe";
import { type Fields, NoteEditor } from "./editor.vibe";
import { enter } from "./notes.vibe";
import { record } from "./recording.vibe";
import { Previous } from "./Previous.tsx";
import { dated, preview } from "./present.ts";
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
  const bin = useTrash(runtime).state;
  const transfer = useTransfer(runtime);
  const hasDocuments = runtime.runSync(NoteDocuments.use((device) => Effect.succeed(device.available)));
  const current = writing.state;
  if (!current?.showing) return null;
  const owner = (event: Editor.Event) => writing.can(event, "Owner");
  const send = (event: Editor.Event) => void writing.send(event, "Owner");
  const edit = (fields: Partial<Fields>) => void runtime.runPromise(NoteEditor.use((editor) => editor.typed(fields)));
  const action = (kind: "close" | "save" | "takeSaved" | "keepMine" | "keepAsNew" | "discard") =>
    void runtime.runPromise(NoteEditor.use((editor) => editor[kind]()));
  const close = () => action("close");
  const updateItem = (index: number, change: Partial<DraftWords["items"][number]>) =>
    edit({ items: saved.items.map((item, at) => at === index ? { ...item, ...change } : item) });
  const folder = saved.kind === "Checklist";
  const deletion: Editor.Event = { type: "deleteNote", ready: bin !== undefined && Trash.ready(bin) };
  const deletable = owner(deletion);
  const exporting = { type: "exportNote", note: current.note, revision: current.draft.base } as const;
  const exportable = hasDocuments && current.draft.sync === "Kept" && transfer.can(exporting, "Owner");
  const editable = owner({ type: "edit", kept: true });
  return (
    <section aria-label="Note editor" data-alpha-subview="notes-editor" className="flex min-h-0 flex-1 flex-col">
      <AppHeader title="" leading={<Button aria-label="Back to notes" size="icon" variant="ghost" onClick={close}><ArrowLeft /></Button>}>
        {editable && <Button aria-label={folder ? "Switch to text" : "Make a checklist"} aria-pressed={folder} size="icon" variant="ghost"
          onClick={() => edit(folder ? { kind: "Text", body: saved.items.map((row) => row.t).join("\n") }
            : { kind: "Checklist", items: saved.body.split("\n").filter((line) => line.trim() !== "").map((t) => ({ t, done: false })), body: "" })}><ListChecks /></Button>}
        {(deletable || exportable) && <Menu>
          <MenuTrigger asChild><Button aria-label="Note actions" size="icon" variant="ghost"><Ellipsis /></Button></MenuTrigger>
          <MenuContent align="end">
            {exportable && <MenuItem onSelect={() => void transfer.send(exporting, "Owner")}><FileDown /> Save as text</MenuItem>}
            {deletable && <MenuItem destructive onSelect={() => send(deletion)}><Trash2 /> Delete</MenuItem>}
          </MenuContent>
        </Menu>}
        {owner({ type: "close" }) && <Button variant="ghost" onClick={close}>Done</Button>}
      </AppHeader>
      <div className="flex w-full max-w-192 flex-1 flex-col self-center px-6">
        <TransferNotice runtime={runtime} />
        <div aria-live="polite" className="text-xs text-muted-foreground">
          {current.draft.sync === "Saving" ? "Saving…" : current.failed ? "Couldn't save the note" : current.full ? "There isn't room to keep your draft" : current.told === "WasUnknown" ? "Alpha couldn't confirm the deletion" : current.told === "WasRefused" ? "Couldn't delete the note" : current.told === "WasFull" ? "Recently deleted is full" : ""}
        </div>
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
        <Input aria-label="Title" placeholder="Title" maxLength={240} value={saved.title} readOnly={!editable}
          onChange={(event) => edit({ title: event.currentTarget.value })} className="h-auto rounded-none border-0 bg-transparent px-0 py-1.5 font-display text-[2rem] font-light shadow-none focus-visible:ring-0" />
        {folder ? <div className="flex flex-col gap-1 py-2">
          {saved.items.map((item, index) => (
            <div className="flex min-h-12 items-center gap-2" key={index}>
              <Checkbox checked={item.done} disabled={!editable} aria-label={item.done ? "Uncheck item" : "Check item"} onCheckedChange={() => updateItem(index, { done: !item.done })} />
              <Input aria-label="Item" value={item.t} readOnly={!editable} onChange={(event) => updateItem(index, { t: event.currentTarget.value })}
                className={`border-0 bg-transparent shadow-none ${item.done ? "text-muted-foreground line-through" : ""}`} />
              {editable && <Button size="icon" variant="ghost" aria-label="Remove item" onClick={() => edit({ items: saved.items.filter((_, at) => at !== index) })}><X /></Button>}
            </div>
          ))}
          {editable && <Button variant="ghost" className="self-start" onClick={() => edit({ items: [...saved.items, { t: "", done: false }] })}><Plus /> Add item</Button>}
        </div> : <Textarea aria-label="Note" placeholder="Note" maxLength={20_000} value={saved.body} readOnly={!editable} onChange={(event) => edit({ body: event.currentTarget.value })}
          className="min-h-52 flex-1 resize-none rounded-none border-0 bg-transparent px-0 py-2 text-[1.0625rem] leading-relaxed shadow-none focus-visible:ring-0" />}
      </div>
    </section>
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
      <AppHeader title="Recently deleted" leading={<Button size="icon" variant="ghost" aria-label="Back to notes" onClick={() => send({ type: "back" })}><ArrowLeft /></Button>}>
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
            {state.question !== "AskFull" && owner({ type: "confirm", storage: true }) && <Button variant="destructive" onClick={() => send({ type: "confirm", storage: true })}>Delete forever</Button>}
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
  const page = pageOf(note?.format?.data.url);
  const event = { type: "visit", mark: state.link.mark } as const;
  return <section aria-label="Link note" className="flex flex-1 flex-col">
    <AppHeader title="Source" leading={<Button variant="ghost" size="icon" aria-label="Back to notes" onClick={() => void link.send({ type: "back" }, "Owner")}><ArrowLeft /></Button>} />
    <article className="flex flex-col items-start gap-4 px-6">
      <h1 className="font-display text-3xl">{note === undefined ? "Link note" : titleOf(note)}</h1>
      {page && <p className="max-w-full break-all text-sm text-muted-foreground">{page}</p>}
      <p className="whitespace-pre-wrap">{note?.body}</p>
      {page && link.can(event, "Owner") && <Button onClick={() => void link.send(event, "Owner")}>Visit page</Button>}
      {link.can({ type: "askRemove" }, "Owner") && <Button variant="secondary" onClick={() => void link.send({ type: "askRemove" }, "Owner")}>Remove source</Button>}
      {state.review.showing && <Alert variant="warn">Remove the web source from this note?
        <div className="mt-2 flex gap-2">
          <Button variant="secondary" onClick={() => void link.send({ type: "back" }, "Owner")}>Cancel</Button>
          {link.can({ type: "confirmRemove" }, "Owner") && <Button variant="destructive" onClick={() => void link.send({ type: "confirmRemove" }, "Owner")}>Remove</Button>}
        </div>
      </Alert>}
    </article>
  </section>;
}

function VoiceNote({ runtime, collection }: { readonly runtime: Runtime; readonly collection: Collection }) {
  const voice = useVoice(runtime);
  const state = voice.state;
  if (!state?.showing) return null;
  const note = collection.noteByNumber.get(state.note);
  const data = note?.format?.data;
  const text = Array.isArray(data?.lines) ? data.lines.flatMap((line) => typeof line === "object" && line !== null && "t" in line && typeof line.t === "string" ? [line.t] : []) : [];
  const summary = Array.isArray(data?.summary) ? data.summary.filter((line): line is string => typeof line === "string") : [];
  const play = { type: "play", from: 0 } as const;
  return <section aria-label="Voice note" className="flex flex-1 flex-col">
    <AppHeader title="Voice note" leading={<Button variant="ghost" size="icon" aria-label="Back to notes" onClick={() => void voice.send({ type: "back" }, "Owner")}><ArrowLeft /></Button>} />
    <article className="flex flex-col gap-3 px-6">
      <h1 className="font-display text-3xl">{note === undefined ? "Voice note" : titleOf(note)}</h1>
      {voice.can(play, "Owner") && <Button className="self-start" variant="secondary" onClick={() => void voice.send(play, "Owner")}><AudioLines /> Play recording</Button>}
      {state.play.status === "Failed" && <Alert variant="warn">This recording couldn't be played</Alert>}
      {summary.length > 0 && <section><h2 className="text-sm font-semibold">Summary</h2>{summary.map((line, index) => <p key={index}>{line}</p>)}</section>}
      {text.length > 0 && <section><h2 className="text-sm font-semibold">Transcript</h2>{text.map((line, index) => <p key={index}>{line}</p>)}</section>}
      {text.length === 0 && note?.body && <p className="whitespace-pre-wrap">{note.body}</p>}
    </article>
  </section>;
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
  const content = runtime.runSync(NoteContent.asEffect());
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
  const reopen = { type: "reopenDraft", covered: false } as const;
  const row = (entry: Notes.Row) => {
    const note = collection.noteByNumber.get(entry.id);
    if (note === undefined) return null;
    const open = { type: "openRow", id: entry.id, covered: Editor.waiting(writing) } as const;
    const pin: Notes.Event = { type: "change", c: { ...Notes.nothing, note: entry.id, base: entry.revision, op: entry.pinned ? "Unpin" : "Pin" }, covered: false };
    return <div key={entry.id} className="group flex items-start border-b border-border">
      <NoteRow className="min-w-0 flex-1 border-0" title={titleOf(note)} aria-label={`Open ${titleOf(note)}`}
        date={dated(note, collection.readAt)} preview={preview(note)} voice={entry.kind === "Voice"}
        onClick={can(open) ? () => listEvent(open) : undefined} />
      {can(pin) && <Menu><MenuTrigger asChild><Button aria-label={`${titleOf(note)} options`} size="icon" variant="ghost" className="mt-1"><Ellipsis /></Button></MenuTrigger>
        <MenuContent align="end">
          <MenuItem onSelect={() => listEvent(pin)}>{entry.pinned ? "Unpin" : "Pin"}</MenuItem>
          {[{ id: 0, name: "No folder" }, ...state.folders].map((folder) => {
            const move: Notes.Event = { type: "change", c: { ...Notes.nothing, op: "Move", note: entry.id, base: entry.revision, folder: folder.id }, covered: false };
            return can(move) && <MenuItem key={folder.id} onSelect={() => listEvent(move)}>Move to {folder.name}</MenuItem>;
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
  const shown = Notes.shown(state).filter((item) => item.id !== writing.note || writing.showing || !Editor.waiting(writing));
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
          <span className="mr-auto text-sm">Unsaved {draft?.title.trim() || "note"}</span>
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
