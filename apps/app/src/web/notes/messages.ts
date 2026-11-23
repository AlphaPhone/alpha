// spec/notes/collection.md, "The status line says what is wrong in one word"; spec/notes/recorder.md, "A recording starts only for the current owner, after any playback has confirmed it stopped"; spec/notes/trash.md, "A restore needs the exact deletion and the current revision, and a delete's Undo the exact deletion"
import type { StatusLabel } from "../../../gen/notes__collection.ts";
import type { RecError } from "../../../gen/notes__recorder.ts";
import type { ShareNotice } from "../../notes/share.vibe";
import type { TrashNotice } from "../../notes/trash.vibe";

/** The one-word status of the collection. */
export const statusText: Record<StatusLabel, string> = {
  NoStatus: "", Opening: "Opening Notes…", Unsaved: "Unsaved", CouldNotOpen: "Couldn’t open", Unconfirmed: "Unconfirmed",
  EarlierNotesNeedReview: "Earlier notes need review",
};

/** The recorder's one short error line. */
export const recorderErrorText: Record<RecError, string> = {
  NoRecError: "", StorageFull: "Storage is full.", RecoveryUnavailable: "Recovery unavailable", MicOff: "Mic off", CallPaused: "Paused",
  TranscriptStopped: "Transcript stopped", NoTranscript: "No transcript", SignInToTranscribe: "Sign in to transcribe", NotSaved: "Not saved",
  WrongAccount: "Wrong account", MediaUnconfirmed: "Previous audio could not stop", MicUnavailable: "Mic unavailable", MicStopped: "The microphone stopped.",
  CheckNotes: "Check Notes. Your recording is kept.",
};

/** What a Trash action did, in one line. */
export const trashNoticeText: Record<TrashNotice, string> = {
  restored: "Restored", "review-again": "Review deletion again", "restore-unconfirmed": "Restore unconfirmed", erased: "Deleted",
  "erase-unconfirmed": "Unconfirmed", "erase-conflict": "Notes changed. Nothing was deleted.", "recording-shared": "This recording needs review before erasing the note.",
  gone: "Gone",
};

/** What a share did, in one line. */
export const shareNoticeText: Record<ShareNotice | "imported", string> = {
  shared: "", copied: "Note text copied.", drafted: "", saved: "Saved.", requested: "Download requested. Check your browser downloads.",
  cancelled: "Nothing exported.", unavailable: "Sharing is unavailable.", changed: "The note changed. Open it again to share.",
  "too-large": "Export requires valid UTF-8 text of at most 64 KiB.", failed: "The note could not be shared.", busy: "Another document is already open. Finish it, then try again.",
  imported: "Imported",
};

/** The days-left mark of a Recently deleted row. */
/** When a note went to Recently deleted, in the phone's own date and time words; empty when the time is unreadable. */
export function deletedText(deletedAt: string): string {
  const at = Date.parse(deletedAt);
  return Number.isFinite(at) ? `Deleted ${new Date(at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}` : "";
}

export function daysLeftText(days: number): string {
  return days === 0 ? "Deleting permanently" : days === 1 ? "1 day left" : `${days} days left`;
}
