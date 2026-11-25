// spec/app/notes/index.md, "Story: See my notes"; spec/app/notes/index.md, "Story: Open a note"; spec/app/notes/index.md, "Pinned notes come first, then the rest, narrowed to the chosen folder"; spec/app/notes/index.md, "While the notes are unavailable, no note or folder is shown, and Connect sends the owner to the account area when it is the agent's notes that are not connected"; spec/app/notes/editor.md, "Story: Write a note"
import { Alert, AppHeader, Button, LinkNoteView, NoteEditor, NoteMenu, NoteRow, NotesList, VoiceNoteView } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import type * as KeyValueStore from "effect/persistence/KeyValueStore";
import { Mic, Plus } from "lucide-react";
import { useSyncExternalStore } from "react";
import type { Machine } from "../../gen/app__notes.effect.vibe";
import { type Change, type Row, nothing, rowOf, shown } from "../../gen/app__notes.ts";
import { useMachine } from "../../gen/app__notes.react.ts";
import type { Machine as EditorMachine } from "../../gen/app__notes__editor.effect.vibe";
import { useMachine as useEditor } from "../../gen/app__notes__editor.react.ts";
import type { Machine as LinkMachine } from "../../gen/app__notes__linkNote.effect.vibe";
import { useMachine as useLink } from "../../gen/app__notes__linkNote.react.ts";
import type { Machine as VoiceMachine } from "../../gen/app__notes__voice.effect.vibe";
import { useMachine as useVoice } from "../../gen/app__notes__voice.react.ts";
import type { Alpha } from "../runtime/area.tsx";
import { Time } from "../runtime/time.vibe";
import { AppBack } from "../shell/AppBack.tsx";
import { type Words, current, subscribe } from "./drafts.ts";
import { clock, dated, preview } from "./present.ts";
import { type Stored, folderName, noteOf } from "./shown.ts";
import { typed } from "./views.vibe";

export interface NotesProps {
  /** Provides the list, `notes` of notes.vibe, the open note's machines, `views` of views.vibe, Alpha's time and the phone's store, which keeps what is typed. */
  runtime: ManagedRuntime.ManagedRuntime<Machine | EditorMachine | VoiceMachine | LinkMachine | Time | KeyValueStore.KeyValueStore, unknown>;
  alpha: Alpha;
}

/** A transcript line's speaker, by the name the recording gave them: initials and first name, or the owner. */
function speaker(name: string | undefined): { readonly initials: string; readonly who: string; readonly own: boolean } {
  const words = (name ?? "").trim().split(/\s+/).filter((word) => word !== "");
  if (words.length === 0 || name === "me") return { initials: "You", who: "You", own: true };
  return { initials: words.map((word) => word[0]).join("").slice(0, 2).toUpperCase(), who: words[0] ?? "", own: false };
}

/**
 * Notes: the owner's notes, the pinned ones first, narrowed to a folder when asked, each opening as its kind needs.
 * @model spec/app/notes/index.md
 */
export function Notes({ runtime, alpha }: NotesProps) {
  const { state, cause, can, send } = useMachine(runtime);
  const editor = useEditor(runtime);
  const voice = useVoice(runtime);
  const link = useLink(runtime);
  const words = useSyncExternalStore(subscribe, current, current);
  const now = runtime.runSync(Time.use((time) => time.latest()));
  if (cause ?? editor.cause ?? voice.cause ?? link.cause) return <Alert variant="destructive" className="m-4">Alpha could not open Notes</Alert>;
  const covered = (editor.state?.showing ?? false) || (voice.state?.showing ?? false) || (link.state?.showing ?? false);
  const rows = state === undefined ? [] : shown(state);
  const row = (line: Row) => {
    const note = noteOf(line.id);
    const open = { type: "openRow", id: line.id, covered } as const;
    const title = note?.title.trim() || "Untitled";
    return (
      <NoteRow
        key={line.id}
        title={title}
        aria-label={`Open ${title}`}
        date={note === undefined ? "" : dated(note, now)}
        preview={note === undefined ? "" : preview(note)}
        voice={line.kind === "Voice"}
        onClick={can(open, "Owner") ? () => void send(open, "Owner") : undefined}
      />
    );
  };
  const status = state?.read.status;
  const retry = { type: "refresh" } as const;
  const fresh = { type: "newNote", kind: "Text", available: status === "Loaded" && (state?.storage ?? false), folder: state?.filter ?? 0, covered } as const;
  const menu = (id: number, size: "sm" | "md") => {
    const held = state === undefined ? undefined : rowOf(state, id);
    const change: Change | undefined = held && { ...nothing, op: held.pinned ? "Unpin" : "Pin", note: id, base: held.revision };
    const pin = change && ({ type: "change", c: change, covered: false } as const);
    return <NoteMenu size={size} pinned={held?.pinned ?? false} onPin={pin && can(pin, "Owner") ? () => void send(pin, "Owner") : undefined} />;
  };
  const type = (next: Words) => void runtime.runPromise(typed(next));
  const done = () => void editor.send({ type: "save" }, "Owner").then(() => editor.send({ type: "close" }, "Owner"));
  const open = editor.state?.showing ? editor.state : undefined;
  const voiceNote: Stored | undefined = voice.state?.showing ? noteOf(voice.state.note) : undefined;
  const linkNote: Stored | undefined = link.state?.showing ? noteOf(link.state.note) : undefined;
  const length = (note: Stored) => clock((note.format?.data.audio?.durationMs ?? 0) / 1000);
  return (
    <section aria-label="Notes" className="relative flex min-h-0 flex-1 flex-col">
      <AppHeader title="Notes" leading={<AppBack alpha={alpha} />}>
        <Button variant="ghost" size="icon" aria-label="Record voice note" disabled><Mic className="size-5" /></Button>
        <Button variant="ghost" size="icon" aria-label="New note" disabled={!editor.can(fresh, "Owner")} onClick={() => void editor.send(fresh, "Owner")}><Plus className="size-5" /></Button>
      </AppHeader>
      <NotesList
        inert={covered}
        state={status === "Failed" ? "unavailable" : status === "Loaded" ? "listed" : "loading"}
        pinned={rows.filter((line) => line.pinned).map(row)}
        others={rows.filter((line) => !line.pinned).map(row)}
        filter={state !== undefined && state.filter !== 0 ? folderName(state.filter) : undefined}
        onClearFilter={() => void send({ type: "clearFilter" }, "Owner")}
        onRetry={can(retry, "Owner") ? () => void send(retry, "Owner") : undefined}
      />
      {open && (
        <NoteEditor
          title={words.title}
          kind={open.kind === "Checklist" ? "list" : "text"}
          body={words.body}
          items={[...words.items]}
          next={words.next}
          locked={open.deleting}
          status={open.failed ? "Not saved" : open.draft.sync === "Conflicted" ? "Changed elsewhere" : undefined}
          menu={open.note > 0 && menu(open.note, "sm")}
          onTitle={(title) => type({ ...words, title })}
          onBody={(body) => type({ ...words, body })}
          onItem={(index, item) => type({ ...words, items: words.items.map((one, at) => (at === index ? { ...item, key: one.key } : one)) })}
          onRemoveItem={(index) => type({ ...words, items: words.items.filter((_, at) => at !== index) })}
          onNext={(next) => type({ ...words, next })}
          onAddItem={() => { if (words.next.trim() !== "") type({ ...words, items: [...words.items, { key: `new:${now}:${words.items.length}`, text: words.next.trim(), done: false }], next: "" }); }}
          onBack={done}
          onDone={done}
        />
      )}
      {voice.state?.showing && voiceNote && (
        <VoiceNoteView
          title={voiceNote.title}
          meta={[dated(voiceNote, now), length(voiceNote)].join(" · ")}
          time={`0:00 / ${length(voiceNote)}`}
          summary={[...(voiceNote.format?.data.summary ?? [])]}
          actions={(voiceNote.format?.data.actions ?? []).map((action) => ({ text: action.t, done: action.done === true }))}
          lines={(voiceNote.format?.data.lines ?? []).map((line) => ({ ...speaker(line.s), at: clock(line.at ?? 0), text: line.t }))}
          menu={menu(voice.state.note, "md")}
          onPlay={voice.can({ type: "play", from: 0 }, "Owner") ? () => void voice.send({ type: "play", from: 0 }, "Owner") : undefined}
          onSeek={(index) => void voice.send({ type: "play", from: index }, "Owner")}
          onBack={() => void voice.send({ type: "back" }, "Owner")}
        />
      )}
      {link.state?.showing && linkNote && (
        <LinkNoteView
          title={linkNote.title}
          domain={linkNote.format?.data.domain ?? ""}
          clips={[...(linkNote.format?.data.clips ?? [])]}
          menu={menu(link.state.note, "md")}
          onVisit={link.can({ type: "visit", mark: link.state.link.mark }, "Owner") ? () => void link.send({ type: "visit", mark: link.state?.link.mark ?? 0 }, "Owner") : undefined}
          onBack={() => void link.send({ type: "back" }, "Owner")}
        />
      )}
    </section>
  );
}
