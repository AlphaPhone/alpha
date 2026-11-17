/**
 * The receipt summary of an approved agent Notes change that failed before anything changed.
 *
 * The change runs through the shared Notes store and its checks (`plugins/plugin-notes/src/client`:
 * `notes-store.ts` `NotesStore.execute`, `notes-contract.ts`, `notes-document-store.ts`,
 * `notes-secure-store.ts`) and, for a deletion, the shared Trash policy (`notes-trash-policy.ts`).
 * They refuse in their own English; each reviewed sentence has Alpha's sentence here. Alpha's own
 * refusals on that path pass through, and anything else reads as {@link NOTES_ACTION_FAILED}.
 */

/** A Notes change that failed for a reason Alpha has no sentence for. */
export const NOTES_ACTION_FAILED = "Notes couldn’t make this change.";

/** Each reviewed refusal of the shared Notes store, contract and Trash policy. */
export const NOTES_ACTION_REFUSALS: ReadonlyMap<string, string> = new Map([
  // notes-store.ts
  [
    "Notes changed in another view. Reopen Notes before editing.",
    "Nothing was changed because Notes changed in another view.",
  ],
  ["Selected note is missing", "That note is no longer in Notes."],
  ["Selected note changed", "Nothing was changed because the note changed after you reviewed it."],
  [
    "Selected note revision changed",
    "Nothing was changed because the note was edited after you reviewed it.",
  ],
  [
    "Only text Notes support agent edits; use the native editor for this note kind",
    "Nothing was changed because your agent can only edit text notes.",
  ],
  [
    "Notes changed before the approved operation",
    "Nothing was changed because Notes changed before your approved change could run.",
  ],
  ["readback mismatch", "Notes couldn’t confirm the saved change."],
  // notes-contract.ts
  ["Unsupported Notes operation", "This Notes change isn’t supported."],
  [
    "Note text exceeds the reviewed transfer bound",
    "Nothing was changed because the note is too long.",
  ],
  [
    "Notes result scope changed",
    "Notes couldn’t confirm the change matched your review.",
  ],
  [
    "Notes result revision changed",
    "Notes couldn’t confirm the change matched your review.",
  ],
  // notes-document-store.ts and notes-secure-store.ts
  [
    "Finish the approved Notes operation first.",
    "Nothing was changed because another approved Notes change is still finishing.",
  ],
  [
    "Another Notes operation is in progress",
    "Nothing was changed because another Notes change is in progress.",
  ],
  ["Notes storage is full. Nothing was written.", "Nothing was saved because Notes storage is full."],
  // notes-trash-policy.ts
  [
    "Deletion already recorded",
    "This deletion is already in Recently deleted.",
  ],
  [
    "A note with this identity already exists",
    "Nothing was changed because a note with the same identity is already in Notes.",
  ],
]);

/** Alpha's own refusals on the approved Notes path (`prototype/agent-adapter.ts`), shown as they are. */
const OWN_REFUSALS: ReadonlySet<string> = new Set([
  "Previous notes isn’t ready, so nothing was changed.",
  "Nothing was changed because Notes is not set to On this phone.",
  "There are no earlier notes on this phone, so nothing was changed.",
]);

/** Alpha's own check that the reviewed Notes screen is still open, worded for the owner. */
const CONTEXT_CHANGED = "Selected Notes context changed";

/** Alpha's receipt summary for a failed approved Notes change. */
export function notesActionFailureText(error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : "";
  const known = NOTES_ACTION_REFUSALS.get(message);
  if (known) return known;
  if (OWN_REFUSALS.has(message)) return message;
  if (message === CONTEXT_CHANGED)
    return "Nothing was changed because Notes changed or closed before your approved change could run.";
  return NOTES_ACTION_FAILED;
}
