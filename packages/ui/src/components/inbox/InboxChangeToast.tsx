import { Toast } from "../Toast.tsx";

const verbs = { archive: "Archived", trash: "Moved to Trash", unarchive: "Moved back to the Inbox", untrash: "Taken out of Trash" } as const;
const nouns = { archive: "archive", trash: "move it to Trash", unarchive: "move it back", untrash: "take it out" } as const;

export type InboxChangeToastProps = {
  /** What was done to the messages. */
  operation: keyof typeof verbs;
  /** How many messages. */
  count: number;
  /** Where it stands: held for a moment to be undone, gone out, refused, or sent without a confirmed answer, or a restore the message has since outrun. */
  phase: "holding" | "done" | "refused" | "unknown" | "outOfDate";
  /** Undoes it while it is held, or, once it went out and can be put back, restores the messages; offered only then. */
  onUndo?: () => void;
};

/**
 * What became of archiving, moving to Trash or restoring: Undo while the change is held, Restore once it went out,
 * and the truth when it was refused, out of date or not confirmed.
 *
 * @model spec/app/inbox/sending.md
 */
export function InboxChangeToast({ operation, count, phase, onUndo }: InboxChangeToastProps) {
  const many = `${count} ${count === 1 ? "email" : "emails"}`;
  const text =
    phase === "refused" ? `Could not ${nouns[operation]} ${many}`
    : phase === "outOfDate" ? "Changed since. Cannot restore."
    : phase === "unknown" ? `Not sure ${many} ${count === 1 ? "was" : "were"} changed. Refresh the list.`
    : `${verbs[operation]} ${many}`;
  const offered = (phase === "holding" || phase === "done") && onUndo;
  return <Toast onUndo={offered ? onUndo : undefined} undoLabel={phase === "done" ? "Restore" : "Undo"}>{text}</Toast>;
}
