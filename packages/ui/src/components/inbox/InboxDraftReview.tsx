import { Button } from "../Button.tsx";
import { Sheet, SheetClose, SheetContent } from "../Sheet.tsx";
import { InboxNotice } from "./InboxNotice.tsx";
import { InboxPill } from "./InboxPill.tsx";
import type { InboxRecipient } from "./InboxRecipientField.tsx";

const operations = {
  send: { title: "Send this email?", confirm: "Send" },
  save: { title: "Save to Gmail Drafts?", confirm: "Save" },
  replace: { title: "Replace the copy in Gmail?", confirm: "Replace" },
  deleteCopy: { title: "Delete the Gmail draft?", confirm: "Delete" },
} as const;

export type InboxDraftReviewProps = {
  /** Whether the review is up; the parent keeps it. */
  open: boolean;
  /** What is being reviewed: sending, saving to Gmail, replacing the copy there, or deleting it. */
  operation: keyof typeof operations;
  /** The account it goes from. */
  from: string;
  /** The To recipients, as the draft shows them now. */
  to: InboxRecipient[];
  /** The Cc recipients. */
  cc?: InboxRecipient[];
  /** The Bcc recipients. */
  bcc?: InboxRecipient[];
  /** The subject. */
  subject: string;
  /** The full text that will be sent or saved, as the owner wrote it. */
  text: string;
  /** The names of the attachments. */
  attachments?: string[];
  /** A send of a draft already sent, or whose send is unknown, which the owner chose to review again: it may already have gone. */
  repeat?: boolean;
  /** The draft changed under this review: it is stopped, and must be looked at again. */
  changed?: boolean;
  /** Goes ahead, once, with exactly what is shown; offered only while the review is of the draft as it is, the grant allows it and, for a send, it has a valid recipient. */
  onConfirm?: () => void;
  /** The request is out: Confirm spins and nothing else presses. */
  confirming?: boolean;
  /** Shows the review again against the draft as it is now; offered after it changed. */
  onReviewAgain?: () => void;
  /** Closes the review without doing anything. */
  onCancel: () => void;
};

const lines = ["to", "cc", "bcc"] as const;

/**
 * What a draft operation will do, shown as it would go: from, recipients, subject, text and attachments. A replacement and a
 * deletion say they cannot be undone, a send with no recipient asks for one, and a change to the draft stops the
 * review until it is looked at again.
 *
 * @model spec/app/inbox/sending.md
 */
export function InboxDraftReview({ open, operation, from, to, cc = [], bcc = [], subject, text, attachments = [], repeat = false, changed = false, onConfirm, confirming = false, onReviewAgain, onCancel }: InboxDraftReviewProps) {
  const { title, confirm } = operations[operation];
  const people = { to, cc, bcc };
  const unaddressed = operation === "send" && (to.length + cc.length + bcc.length === 0 || [...to, ...cc, ...bcc].some((r) => !r.valid));
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next && !confirming) onCancel(); }}>
      <SheetContent
        title={title}
        actions={
          <>
            <SheetClose asChild><Button variant="secondary" disabled={confirming}>Cancel</Button></SheetClose>
            {changed ? (
              onReviewAgain ? <Button onClick={onReviewAgain}>Review again</Button> : null
            ) : (
              <Button variant={operation === "deleteCopy" || operation === "replace" ? "destructive" : "primary"} loading={confirming} disabled={!onConfirm} onClick={onConfirm}>{confirm}</Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {changed ? <InboxNotice kind="draftChanged" /> : null}
          {repeat ? <InboxNotice kind="mayHaveGone" /> : null}
          {operation === "replace" || operation === "deleteCopy" ? <InboxNotice kind="cannotUndo" /> : null}
          {unaddressed ? <InboxNotice kind="needsRecipient" /> : null}
          <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-3 text-base">
            <dt className="text-sm text-muted-foreground">From</dt>
            <dd className="min-w-0 break-words">{from}</dd>
            {lines.map((line) =>
              people[line].length > 0 ? (
                <div key={line} className="col-span-2 grid grid-cols-subgrid items-baseline">
                  <dt className="text-sm text-muted-foreground">{line === "to" ? "To" : line === "cc" ? "Cc" : "Bcc"}</dt>
                  <dd className="flex min-w-0 flex-wrap gap-2">{people[line].map(({ address, valid }) => <InboxPill key={address} label={address} invalid={!valid} />)}</dd>
                </div>
              ) : null,
            )}
            <dt className="text-sm text-muted-foreground">Subject</dt>
            <dd className="min-w-0 font-medium break-words">{subject || "(no subject)"}</dd>
            {attachments.length > 0 ? (
              <>
                <dt className="text-sm text-muted-foreground">Files</dt>
                <dd className="flex min-w-0 flex-wrap gap-2">{attachments.map((name) => <InboxPill key={name} label={name} />)}</dd>
              </>
            ) : null}
          </dl>
          {operation !== "deleteCopy" ? <section aria-label="Message" className="min-w-0 border-t pt-4"><p className="text-base wrap-anywhere whitespace-pre-wrap">{text || "(no message)"}</p></section> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
