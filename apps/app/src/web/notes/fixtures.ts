// States the Notes components reach, for their stories (`*.meta.tsx`).
import type { StickyNote } from "@elizaos/plugin-notes/types";
import type { Recorder } from "../../../gen/notes__recorder.ts";
import { initial as recorderInitial } from "../../../gen/notes__recorder.ts";
import type { TrashView } from "../../../gen/notes__trash.ts";
import { initial as trashInitial } from "../../../gen/notes__trash.ts";
import type { SourceDialog } from "../../../gen/notes__webSource.ts";
import { initial as sourceDialogInitial } from "../../../gen/notes__webSource.ts";
import type { DraftContent } from "../../notes/editor.vibe";
import type { NotesFolder } from "../../notes/folders.vibe";
import { rowOf, type NoteRow, type WebSource } from "../../notes/list.vibe";
import type { RecorderDisplay } from "../../notes/recorder.vibe";
import type { TrashRow } from "../../notes/trash.vibe";

const day = 24 * 60 * 60 * 1000;
/** The fixed now the stories render dates against. */
export const now = Date.parse("2026-11-20T10:00:00.000Z");

const notes: StickyNote[] = [
  { id: "groceries", title: "Groceries", body: "", color: "yellow", createdAt: new Date(now - day).toISOString(), updatedAt: new Date(now - day).toISOString(),
    format: { kind: "list", data: { items: [{ t: "Oat milk", done: true }, { t: "Lemons", done: false }], pinned: true } } },
  { id: "standup", title: "Standup", body: "\nShip the Trash review and the recorder fixes.", color: "yellow", createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(now - 60 * 60 * 1000).toISOString() },
  { id: "walk-memo", title: "Voice note", body: "\nRemember to call the clinic.", color: "yellow", createdAt: new Date(now - 3 * day).toISOString(), updatedAt: new Date(now - 3 * day).toISOString(),
    format: { kind: "voice", data: { recordingId: "rec_1", audio: { audioId: "rec_1", durationMs: 42000 }, lines: [{ s: "me", at: 0, t: "Remember to call the clinic." }], summary: [], actions: [] } } },
];

/** The rows of a small collection: a pinned checklist, a text note and a voice note. */
export const rows: NoteRow[] = notes.map(rowOf);

/** A clean draft of the text note. */
export const draft: DraftContent = { token: 1, creationId: "c-1", title: "Standup", body: "Ship the Trash review and the recorder fixes.", separator: "\n", framing: "verbatim", color: "yellow", basePrint: "" };

/** Recently deleted with the three-day choice. */
export const trashRows: TrashRow[] = [{ id: "old-plan", title: "Old plan", kind: "Note", deletedAt: new Date(now - day).toISOString(), revision: 4, daysLeft: 2 }];
export const trashOpen: TrashView = { ...trashInitial, retentionOn: true, rows: 1, opened: true, revision: 4 };
export const trashConfirm: TrashView = { ...trashOpen, confirm: "ConfirmOne", reviewRevision: 4 };
export const trashRestoreOnly: TrashView = { ...trashOpen, retentionOn: false };

/** The recorder while recording, and after a claimed save could not be confirmed. */
export const recording: Recorder = { ...recorderInitial, phase: "RecRecording", attempt: 1, recording: 1, segments: 2, transcribed: 1, longEnough: true, lastCapture: 1 };
export const claimUnconfirmed: Recorder = { ...recording, phase: "RecStopped", savePending: true, error: "CheckNotes" };
export const recordingDisplay: RecorderDisplay = { recordingId: "rec_2", durationMs: 75000, levels: [0.2, 0.6, 0.4, 0.8, 0.3], transcript: "First thing tomorrow", positionMs: 0 };

/** The owner's folders. */
export const folders: NotesFolder[] = [{ id: "f-work", name: "Work", createdAt: now - 10 * day }, { id: "f-home", name: "Home", createdAt: now - 5 * day }];

/** The page a summary note came from, and its dialog open, then after a removal that could not be confirmed. */
export const webSource: WebSource = { name: "Planning the week", url: "https://example.com/articles/planning-the-week" };
export const sourceOpen: SourceDialog = { ...sourceDialogInitial, opened: true, gen: 1 };
export const sourceUnconfirmed: SourceDialog = { ...sourceOpen, busy: true, acted: 1, unconfirmed: true };
