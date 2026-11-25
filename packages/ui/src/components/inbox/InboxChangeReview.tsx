import { InboxNotice } from "./InboxNotice.tsx";
import { InboxReviewDialog } from "./InboxReviewDialog.tsx";

const operations = {
  archive: { verb: "Archive" },
  trash: { verb: "Move to Trash" },
  unarchive: { verb: "Restore" },
  untrash: { verb: "Restore" },
  star: { verb: "Star" },
  unstar: { verb: "Remove stars from" },
  markRead: { verb: "Mark", suffix: " as read" },
  markUnread: { verb: "Mark", suffix: " as unread" },
} as const;

export type InboxChangeReviewProps = {
  /** Whether the review is up; the parent keeps it. */
  open: boolean;
  /** The change being reviewed for the selected messages. */
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
 * The selected messages and the reviewed change that would affect those messages.
 *
 * @model spec/app/inbox/sending.md
 */
export function InboxChangeReview({ open, operation, messages, changed = false, onConfirm, confirming = false, onCancel }: InboxChangeReviewProps) {
  const action = operations[operation];
  const one = messages.length === 1 ? messages[0] : undefined;
  const count = `${messages.length} ${messages.length === 1 ? "email" : "emails"}`;
  const suffix = "suffix" in action ? action.suffix : "";
  return (
    <InboxReviewDialog open={open} title={`${action.verb} ${count}${suffix}?`} onYes={changed ? undefined : onConfirm} busy={confirming} onNo={onCancel}>
      {changed ? <InboxNotice kind="selectAgain" />
        : one ? <p className="truncate text-muted-foreground">{one.subject || one.sender}</p>
          : <ul className="flex max-h-50 flex-col gap-1 overflow-y-auto text-muted-foreground">{messages.map(({ id, subject, sender }) => <li key={id} className="truncate">{subject || sender}</li>)}</ul>}
    </InboxReviewDialog>
  );
}
