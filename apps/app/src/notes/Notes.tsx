// spec/app/notes/index.md, "Story: See my notes"; spec/app/notes/index.md, "Story: Open a note"; spec/app/notes/index.md, "Pinned notes come first, then the rest, narrowed to the chosen folder"; spec/app/notes/index.md, "While the notes are unavailable, no note or folder is shown, and Connect sends the owner to the account area when it is the agent's notes that are not connected"
import { Alert, AppHeader, Button, NoteRow, NotesList } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Mic, Plus } from "lucide-react";
import type { Machine } from "../../gen/app__notes.effect.vibe";
import { type Row, shown } from "../../gen/app__notes.ts";
import { useMachine } from "../../gen/app__notes.react.ts";
import type { Alpha } from "../runtime/area.tsx";
import { Time } from "../runtime/time.vibe";
import { AppBack } from "../shell/AppBack.tsx";
import { dated, preview } from "./present.ts";
import { folderName, noteOf } from "./shown.ts";

export interface NotesProps {
  /** Provides the list, `notes` of notes.vibe, and Alpha's time. */
  runtime: ManagedRuntime.ManagedRuntime<Machine | Time, unknown>;
  alpha: Alpha;
}

/**
 * Notes: the owner's notes, the pinned ones first, narrowed to a folder when asked, each opening as its kind needs.
 * @model spec/app/notes/index.md
 */
export function Notes({ runtime, alpha }: NotesProps) {
  const { state, cause, can, send } = useMachine(runtime);
  const now = runtime.runSync(Time.use((time) => time.latest()));
  if (cause) return <Alert variant="destructive" className="m-4">Alpha could not open Notes</Alert>;
  const rows = state === undefined ? [] : shown(state);
  const row = (line: Row) => {
    const note = noteOf(line.id);
    const open = { type: "openRow", id: line.id, covered: false } as const;
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
  return (
    <section aria-label="Notes" className="flex min-h-0 flex-1 flex-col">
      <AppHeader title="Notes" leading={<AppBack alpha={alpha} />}>
        <Button variant="ghost" size="icon" aria-label="Record voice note" disabled><Mic className="size-5" /></Button>
        <Button variant="ghost" size="icon" aria-label="New note" disabled><Plus className="size-5" /></Button>
      </AppHeader>
      <NotesList
        state={status === "Failed" ? "unavailable" : status === "Loaded" ? "listed" : "loading"}
        pinned={rows.filter((line) => line.pinned).map(row)}
        others={rows.filter((line) => !line.pinned).map(row)}
        filter={state !== undefined && state.filter !== 0 ? folderName(state.filter) : undefined}
        onClearFilter={() => void send({ type: "clearFilter" }, "Owner")}
        onRetry={can(retry, "Owner") ? () => void send(retry, "Owner") : undefined}
      />
    </section>
  );
}
