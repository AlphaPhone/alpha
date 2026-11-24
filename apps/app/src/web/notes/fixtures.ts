// States the Notes components reach, for their stories (`*.meta.tsx`).
import type { StickyNote } from "@elizaos/plugin-notes/types";
import { initial as collectionInitial, type Collection } from "../../../gen/notes__collection.ts";
import { initial as editorInitial, type Editor } from "../../../gen/notes__editor.ts";
import type { Recorder } from "../../../gen/notes__recorder.ts";
import { initial as recorderInitial } from "../../../gen/notes__recorder.ts";
import type { TrashView } from "../../../gen/notes__trash.ts";
import { initial as trashInitial } from "../../../gen/notes__trash.ts";
import type { SourceDialog } from "../../../gen/notes__webSource.ts";
import { initial as sourceDialogInitial } from "../../../gen/notes__webSource.ts";
import type { DraftContent, KeptReview } from "../../notes/editor.vibe";
import type { NotesFolder } from "../../notes/folders.vibe";
import { rowOf, type NoteRow, type WebSource } from "../../notes/list.vibe";
import type { RecorderDisplay } from "../../notes/recorder.vibe";
import type { TrashRow } from "../../notes/trash.vibe";
import type { PreviousDeviceNotes as PreviousNotesData } from "../../notes/previous-device-notes.ts";

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

/** Notes reading the owner's collection for the first time. */
export const opening: Collection = { ...collectionInitial, owner: 1, ticket: 1, phase: "Loading" };

/** The collection read and current. */
export const ready: Collection = { ...opening, phase: "Ready", revision: 3 };

/** A save in flight. */
export const saving: Collection = { ...ready, phase: "Saving" };

/** The collection could not be read. */
export const readFailed: Collection = { ...opening, phase: "Review", review: "ReadReview", failure: "ReadFailed" };

/** A change whose save could not be confirmed. */
export const saveUnconfirmed: Collection = { ...ready, phase: "Review", review: "ChangeReview", failure: "WriteFailed", uncertain: true };

/** The editor bound to the owner, no note open. */
export const editorClosed: Editor = { ...editorInitial, current: true, revision: 3 };

/** The text note open in the editor. */
export const editorOpen: Editor = { ...editorClosed, present: true, token: 1, draftId: "standup", base: 3, nextToken: 2 };

/** A draft kept after its save could not be confirmed. */
export const keptDraft: KeptReview = { noteId: "standup", title: "Standup", body: "Ship the Trash review and the recorder fixes." };

/** Forty notes over two months, for a long list. */
export const manyRows: NoteRow[] = Array.from({ length: 40 }, (_, at): StickyNote => ({
  id: `note-${at}`, title: at % 7 === 0 ? `Meeting notes ${at}: quarterly planning with the design, platform and support teams` : `Note ${at}`,
  body: "\nA few lines about what was decided and who follows up.", color: "yellow",
  createdAt: new Date(now - at * 1.5 * day).toISOString(), updatedAt: new Date(now - at * 1.5 * day).toISOString(),
})).map(rowOf);

/** Recently deleted, the recorder and the web source dialog, all closed. */
export const trashClosed: TrashView = { ...trashInitial, retentionOn: true };
export const recorderClosed: Recorder = recorderInitial;
export const sourceClosed: SourceDialog = sourceDialogInitial;

/** What an earlier installation kept: two saved notes and pending deletions in its draft. */
export const earlierNotes: PreviousNotesData = {
  saved: { status: "available", pendingRemovals: 0, notes: [
    { id: "p1", title: "Packing list", body: "Passport\nCharger\nRain jacket", details: [] },
    { id: "p2", title: "", body: "Call the landlord about the heating before the end of the month.", details: ["Checklist: 1 of 3 done"] },
  ] },
  draft: { status: "available", pendingRemovals: 2, notes: [{ id: "p3", title: "Gift ideas", body: "A book for Sam", details: [] }] },
};

/** Nothing was kept by an earlier installation. */
export const noEarlierNotes: PreviousNotesData = { saved: { status: "empty" }, draft: { status: "empty" } };

/** The saved notes could not be read; the draft held nothing. */
export const earlierUnreadable: PreviousNotesData = { saved: { status: "unavailable" }, draft: { status: "empty" } };
