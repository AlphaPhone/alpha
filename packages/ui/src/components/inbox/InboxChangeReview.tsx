import { InboxNotice } from "./InboxNotice.tsx";
import { InboxReviewDialog } from "./InboxReviewDialog.tsx";

const operations = {
  archive: { verb: "Archive" },
  trash: { verb: "Move to Trash" },
  unarchive: { verb: "Restore" },
  untrash: { verb: "Restore" },
} as const;

export type InboxChangeReviewProps = {
  /** Whether the review is up; the parent keeps it. */
  open: boolean;
  /** What is being reviewed: archiving or Trash for the messages chosen, or putting them back. */
  operation: keyof typeof operations;
  /** The messages it would change, as the list's revision has them. */
  messages: { id: string; sender: string; subject: string }[];
  /** The messages changed under this review: it is stopped and they must be chosen again. */
  changed?: boolean;
  /** Goes ahead; archive and Trash are then held for a moment, to be undone; offered only while the review is of the list's revision and the grant allows it. */
  onConfirm?: () => void;
  /** The request is out: Confirm spins and nothing else presses. */
  confirming?: boolean;
  /** Closes the review without doing anything. */
  onCancel: () => void;
};

/**
 * Archiving, moving to Trash or restoring, shown for the messages it would change, so what is confirmed is what was
 * chosen.
 *
 * @model spec/app/inbox/sending.md
 */
export function InboxChangeReview({ open, operation, messages, changed = false, onConfirm, confirming = false, onCancel }: InboxChangeReviewProps) {
  const { verb } = operations[operation];
  const one = messages.length === 1 ? messages[0] : undefined;
  return (
    <InboxReviewDialog open={open} title={`${verb} ${messages.length} ${messages.length === 1 ? "email" : "emails"}?`} onYes={changed ? undefined : onConfirm} busy={confirming} onNo={onCancel}>
      {changed ? <InboxNotice kind="selectAgain" /> : one ? <p className="truncate text-muted-foreground">{one.subject || one.sender}</p> : undefined}
    </InboxReviewDialog>
  );
}
