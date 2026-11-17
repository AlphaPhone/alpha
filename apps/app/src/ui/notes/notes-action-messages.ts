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
export const NOTES_ACTION_FAILED = "Notes couldn’t make this change. Nothing was changed.";

/** Each reviewed refusal of the shared Notes store, contract and Trash policy. */
export const NOTES_ACTION_REFUSALS: ReadonlyMap<string, string> = new Map([
  // notes-store.ts
  [
    "Notes changed in another view. Reopen Notes before editing.",
    "Notes changed in another view. Reopen Notes, then ask again. Nothing was changed.",
  ],
  ["Selected note is missing", "That note is no longer in Notes. Nothing was changed."],
  ["Selected note changed", "That note changed after you reviewed it. Nothing was changed."],
  [
    "Selected note revision changed",
    "That note was edited after you reviewed it. Nothing was changed.",
  ],
  [
    "Only text Notes support agent edits; use the native editor for this note kind",
    "Your agent can only edit text notes. Open this note in Notes to change it. Nothing was changed.",
  ],
  [
    "Notes changed before the approved operation",
    "Notes changed before your approved change could run. Nothing was changed.",
  ],
  ["readback mismatch", "Notes couldn’t confirm the saved change. Reopen Notes to check it."],
  // notes-contract.ts
  ["Unsupported Notes operation", "This Notes change isn’t supported. Nothing was changed."],
  [
    "Note text exceeds the reviewed transfer bound",
    "The note is too long for this change. Nothing was changed.",
  ],
  [
    "Notes result scope changed",
    "Notes couldn’t confirm the change matched your review. Reopen Notes to check it.",
  ],
  [
    "Notes result revision changed",
    "Notes couldn’t confirm the change matched your review. Reopen Notes to check it.",
  ],
  // notes-document-store.ts and notes-secure-store.ts
  [
    "Finish the approved Notes operation first.",
    "Another approved Notes change is still finishing. Nothing was changed.",
  ],
  [
    "Another Notes operation is in progress",
    "Another Notes change is in progress. Nothing was changed.",
  ],
  ["Notes storage is full. Nothing was written.", "Notes storage is full. Nothing was saved."],
  // notes-trash-policy.ts
  [
    "Deletion already recorded",
    "This deletion is already in Recently deleted. Nothing more was changed.",
  ],
  [
    "A note with this identity already exists",
    "A note with the same identity is already in Notes. Nothing was changed.",
  ],
]);

const PREVIOUS_NOTES_NOT_READY = "Previous notes isn’t ready.";
const PREVIOUS_NOTES_NOT_CHOSEN = "Open Notes options, choose On this phone, then ask again.";
const PREVIOUS_NOTES_ABSENT = "There are no earlier notes on this phone.";

/**
 * Why an agent request for the notes saved on this phone ("Previous notes") did not run, and that
 * nothing was `effect`. `legacy`: Previous notes is the open source but its store is not ready.
 * Otherwise the phone says there are no earlier notes only when the presence read proved it
 * (`absent`); a store that is present, unreadable or not yet read sends the owner to Notes.
 */
export function previousNotesRefusal(
  source: "canonical" | "legacy",
  availability: "present" | "absent" | "unavailable" | null,
  effect: "shared" | "changed" | "saved",
): string {
  const reason =
    source === "legacy"
      ? PREVIOUS_NOTES_NOT_READY
      : availability === "absent"
        ? PREVIOUS_NOTES_ABSENT
        : PREVIOUS_NOTES_NOT_CHOSEN;
  return `${reason} Nothing was ${effect}.`;
}

/** Alpha's own refusals on the approved Notes path (`prototype/agent-adapter.ts`), shown as they are. */
const OWN_REFUSALS: ReadonlySet<string> = new Set(
  [PREVIOUS_NOTES_NOT_READY, PREVIOUS_NOTES_NOT_CHOSEN, PREVIOUS_NOTES_ABSENT].map(
    (reason) => `${reason} Nothing was changed.`,
  ),
);

/** Alpha's own check that the reviewed Notes screen is still open, worded for the owner. */
const CONTEXT_CHANGED = "Selected Notes context changed";

/** Alpha's receipt summary for a failed approved Notes change. */
export function notesActionFailureText(error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : "";
  const known = NOTES_ACTION_REFUSALS.get(message);
  if (known) return known;
  if (OWN_REFUSALS.has(message)) return message;
  if (message === CONTEXT_CHANGED)
    return "Notes changed or closed before your approved change could run. Nothing was changed.";
  return NOTES_ACTION_FAILED;
}
