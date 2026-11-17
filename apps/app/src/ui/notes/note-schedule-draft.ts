/**
 * A reviewed Calendar event or reminder draft from one canonical note. The draft is only text and
 * a back-link: nothing is scheduled until the owner saves it in Calendar, and Alpha's Notes view
 * decides where the draft opens. The draft text is the note's open action items: unchecked
 * `actions` or list `items`, otherwise its body.
 *
 * Alpha owns the copy shown when a note cannot start a draft; the draft text, its length limit and
 * the record back-link come from the staged Notes client.
 */
import type { StickyNote } from "@elizaos/plugin-notes/types";
import { recordNoteOriginFor } from "@elizaos/plugin-notes/client/note-origin";
import {
  NOTE_SCHEDULE_TEXT_LIMIT,
  type NoteScheduleDraft,
  type NoteScheduleKind,
  noteScheduleText,
} from "@elizaos/plugin-notes/client/note-schedule-draft";

export type { NoteScheduleKind };
type NoteScheduleDraftResult =
  | { status: "ready"; draft: NoteScheduleDraft }
  | { status: "empty" | "too-long" | "invalid"; message: string };

export async function noteScheduleDraft(
  note: StickyNote,
  kind: NoteScheduleKind,
): Promise<NoteScheduleDraftResult> {
  const notes = noteScheduleText(note);
  if (!notes)
    return {
      status: "empty",
      message: "This note has no open items or text to schedule.",
    };
  if (notes.length > NOTE_SCHEDULE_TEXT_LIMIT)
    return {
      status: "too-long",
      message:
        kind === "event"
          ? "Shorten this note before creating an event. Nothing was added to your calendar."
          : "Shorten this note before creating a reminder. Nothing scheduled.",
    };
  const origin = await recordNoteOriginFor(note);
  if (!origin)
    return { status: "invalid", message: "This note cannot be linked." };
  return {
    status: "ready",
    draft: {
      kind,
      title: String(note.title ?? ""),
      notes,
      origin,
    },
  };
}
