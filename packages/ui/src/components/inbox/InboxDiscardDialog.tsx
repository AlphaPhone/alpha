import { ConfirmDialog } from "../ConfirmDialog.tsx";

export type InboxDiscardDialogProps = {
  /** Whether the question is being asked; the parent keeps it. */
  open: boolean;
  /** The draft has a copy in Gmail's Drafts, which discarding does not touch. */
  gmailCopy?: boolean;
  /** Forgets the draft on the phone; the parent offers it only once the draft is wholly written and handed to nothing. */
  onDiscard: () => void;
  /** Keeps the draft. */
  onKeep: () => void;
};

/**
 * Asked before a draft is discarded. A copy saved in Gmail's Drafts stays there until it is deleted as an operation of
 * its own.
 *
 * @model spec/app/inbox/drafts.md
 */
export function InboxDiscardDialog({ open, gmailCopy = false, onDiscard, onKeep }: InboxDiscardDialogProps) {
  return (
    <ConfirmDialog open={open} title="Discard this draft?" confirmLabel="Discard" cancelLabel="Keep" destructive onConfirm={onDiscard} onCancel={onKeep}>
      {gmailCopy ? "Its copy in Gmail Drafts stays there." : undefined}
    </ConfirmDialog>
  );
}
