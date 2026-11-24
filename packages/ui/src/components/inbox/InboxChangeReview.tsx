import { Button } from "../Button.tsx";
import { ListGroup } from "../ListGroup.tsx";
import { ListRow } from "../ListRow.tsx";
import { Sheet, SheetClose, SheetContent } from "../Sheet.tsx";
import { InboxNotice } from "./InboxNotice.tsx";

const operations = {
  archive: { verb: "Archive", confirm: "Archive" },
  trash: { verb: "Move to Trash", confirm: "Move to Trash" },
  unarchive: { verb: "Move back to the Inbox", confirm: "Move back" },
  untrash: { verb: "Take out of Trash", confirm: "Take out" },
} as const;

const shown = 4;

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
  const { verb, confirm } = operations[operation];
  const rest = messages.length - shown;
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next && !confirming) onCancel(); }}>
      <SheetContent
        title={`${verb}?`}
        description={`${messages.length} ${messages.length === 1 ? "email" : "emails"}`}
        actions={
          <>
            <SheetClose asChild><Button variant="secondary" disabled={confirming}>Cancel</Button></SheetClose>
            {changed ? null : <Button loading={confirming} disabled={!onConfirm} onClick={onConfirm}>{confirm}</Button>}
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {changed ? <InboxNotice kind="selectAgain" /> : null}
          <ListGroup surface="plain">
            {messages.slice(0, shown).map(({ id, sender, subject }) => <ListRow key={id} title={subject} detail={sender} />)}
          </ListGroup>
          {rest > 0 ? <p className="px-4 text-sm text-muted-foreground">+{rest}</p> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
