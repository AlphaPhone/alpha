import { InboxReviewDialog } from "./InboxReviewDialog.tsx";

export type InboxDiscardDialogProps = {
  /** Whether the question is being asked; the parent keeps it. */
  open: boolean;
  /** The draft has a copy in Gmail's Drafts, which discarding does not touch. */
  gmailCopy?: boolean;
  /** Local draft titles shown in a shelf selection, when reviewing several drafts. */
  drafts?: readonly { id: number; subject: string }[];
  /** Forgets the draft on the phone; the parent offers it only once the draft is wholly written and handed to nothing. */
  onDiscard?: () => void;
  /** Keeps the draft. */
  onKeep: () => void;
};

/**
 * Asked before a draft is discarded. A copy saved in Gmail's Drafts stays there until it is deleted as an operation of
 * its own.
 *
 * @model spec/app/inbox/drafts.md
 */
export function InboxDiscardDialog({ open, gmailCopy = false, drafts, onDiscard, onKeep }: InboxDiscardDialogProps) {
  const title = drafts === undefined ? "Discard this draft?" : `Delete ${drafts.length} local ${drafts.length === 1 ? "draft" : "drafts"}?`;
  return (
    <InboxReviewDialog open={open} title={title} noLabel={drafts ? "Cancel" : "Keep"} yesLabel={drafts ? "Delete" : "Discard"} onYes={onDiscard} onNo={onKeep}>
      {drafts ? <ul className="flex max-h-50 flex-col gap-1 overflow-y-auto text-muted-foreground">{drafts.map(({ id, subject }) => <li key={id} className="truncate">{subject}</li>)}</ul> : null}
      {drafts && !onDiscard ? <p role="status" className="mt-2 text-muted-foreground">These drafts changed. Select them again.</p> : null}
      {gmailCopy ? <p className="text-muted-foreground">{drafts ? "Any copies in Gmail Drafts stay there." : "Its copy in Gmail Drafts stays there."}</p> : null}
    </InboxReviewDialog>
  );
}
