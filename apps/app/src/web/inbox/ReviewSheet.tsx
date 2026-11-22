// spec/inbox/operations.md, "Story: Change or send from my mailbox once, as I reviewed it"; spec/inbox/operations.md, "A confirmed result offers only its follow-ups: undo, continue the Gmail draft, delete it"
import type { OperationRecord } from "../../../gen/inbox__operations.ts";
import { canContinueDraft, canDeleteGmailDraft, canUndo, clearable, notStarted } from "../../../gen/inbox__operations.ts";
import { Button, Sheet, SheetContent } from "../components/ui/index.ts";
import { reviewTitle } from "./messages.ts";

export type ReviewSheetProps = {
  /** The selected account's operation, or none. */
  record: OperationRecord | undefined;
  /** Whether the owner opened the sheet. */
  open: boolean;
  /** Whether the review can be confirmed now: the kind is allowed and, for an email, the composer shows it. */
  confirmable: boolean;
  busy: boolean;
  onConfirm: () => void;
  onRefresh: () => void;
  onRetry: () => void;
  onClear: () => void;
  onAbandon: () => void;
  onUndo: () => void;
  onContinueDraft: () => void;
  onDeleteDraft: () => void;
  onClose: () => void;
};

function status(r: OperationRecord): string {
  const send = r.kind === "SendKind"
  if (notStarted(r)) return send ? "Gmail reports that this message was not sent. A late request can still deliver it." : "Gmail reports that this change was not made. A late request can still make it."
  if (r.phase === "Dispatching" || r.receipt.receiptState === "UnknownReceipt" || r.receipt.receiptState === "DispatchedReceipt")
    return send ? "Delivery outcome is unknown. Check the saved receipt; don't send this message again." : "The outcome of this change is unknown. Don't repeat the change."
  if (r.receipt.receiptState === "SucceededReceipt") return "Gmail confirmed this."
  if (r.receipt.receiptState === "RejectedReceipt") return "Gmail rejected this."
  if (r.phase === "Preparing") return "Gmail's review didn't match. Nothing was sent."
  return send ? "Review every field before confirming. No mail has been sent." : "Review this change before confirming. Nothing has been changed."
}

/**
 * The review and receipt of the selected account's operation: what Gmail reviewed, and the one step that dispatches it.
 * @model spec/inbox/operations.md
 */
export function ReviewSheet({ record, open, confirmable, busy, onConfirm, onRefresh, onRetry, onClear, onAbandon, onUndo, onContinueDraft, onDeleteDraft, onClose }: ReviewSheetProps) {
  if (record === undefined) return null;
  const review = record.review;
  const settled = record.phase === "Observed";
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent side="bottom" title={reviewTitle[record.kind]}>
        <div className="flex flex-col gap-3 px-5 pb-5">
          <p role="status">{status(record)}</p>
          {review.sender !== "" && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground">From</dt><dd>{review.sender}</dd>
              {review.toList.length > 0 && <><dt className="text-muted-foreground">To</dt><dd>{review.toList.join(", ")}</dd></>}
              {review.ccList.length > 0 && <><dt className="text-muted-foreground">Cc</dt><dd>{review.ccList.join(", ")}</dd></>}
              {review.bccList.length > 0 && <><dt className="text-muted-foreground">Bcc</dt><dd>{review.bccList.join(", ")}</dd></>}
              {review.subject !== "" && <><dt className="text-muted-foreground">Subject</dt><dd>{review.subject}</dd></>}
            </dl>
          )}
          {(review.files.length > 0 || review.forwarded.length > 0) && (
            <ul className="font-mono text-xs">
              {review.files.map((f) => <li key={f.sha256}>{f.name} · {f.bytes} bytes · SHA-256 {f.sha256.slice(0, 12)}</li>)}
              {review.forwarded.map((f) => <li key={f.sha256}>{f.name} (forwarded original) · {f.bytes} bytes</li>)}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            {record.phase === "Reviewing" && (
              <Button disabled={!confirmable || busy} loading={busy} onClick={onConfirm}>
                {record.kind === "SendKind" ? "Send this email" : record.kind === "DraftDeleteKind" ? "Permanently delete draft" : "Confirm this change"}
              </Button>
            )}
            {record.phase === "Preparing" && <Button variant="outline" disabled={busy} onClick={onRetry}>Retry</Button>}
            {(record.phase === "Dispatching" || (settled && record.receipt.receiptState !== "SucceededReceipt" && record.receipt.receiptState !== "RejectedReceipt")) && (
              <Button variant="outline" disabled={busy} onClick={onRefresh}>Check receipt</Button>
            )}
            {notStarted(record) && <Button variant="destructive" disabled={busy} onClick={onAbandon}>Discard this operation</Button>}
            {canUndo(record) && <Button variant="outline" disabled={busy} onClick={onUndo}>Undo</Button>}
            {canContinueDraft(record) && <Button variant="outline" disabled={busy} onClick={onContinueDraft}>Edit draft</Button>}
            {canDeleteGmailDraft(record) && <Button variant="outline" disabled={busy} onClick={onDeleteDraft}>Permanently delete draft</Button>}
            {clearable(record) && (
              <Button variant="ghost" disabled={busy} onClick={onClear}>{record.phase === "Reviewing" || record.phase === "Preparing" ? "Cancel unsent review" : "Close receipt"}</Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
