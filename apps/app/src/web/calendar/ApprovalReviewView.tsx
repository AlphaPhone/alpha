// spec/calendar/approvals.md, "Story: Approve or decline a Calendar change the agent asked for"
import { approvalStatus, type ApprovalStatus } from "../../../gen/calendar__approvals.ts";
import type { ApprovalSheet } from "../../calendar/approvals.vibe";
import { Button, Sheet, SheetContent } from "../components/ui/index.ts";

/** The approval review sheet, and the owner's answers to it. */
export type ApprovalReviewViewProps = {
  /** The review's state, the request it reads and what it would apply. */
  sheet: ApprovalSheet;
  onClose: () => void;
  onChoose: (decision: "ApproveChange" | "RejectChange") => void;
};

const STATUS_TEXT: Readonly<Record<ApprovalStatus, string>> = {
  StatusUnavailable: "Status unavailable", StatusExpired: "Review expired", StatusAwaiting: "Awaiting your approval",
  StatusApprovalUnavailable: "Approval unavailable", StatusRetryable: "Nothing changed. Approve to try again", StatusDeclined: "Request declined",
  StatusClosed: "Review closed", StatusNotConfirmed: "Change not confirmed",
};

/**
 * The review of a Calendar change waiting for approval: exactly the fields it would apply, read again at the tap.
 * @model spec/calendar/approvals.md
 */
export function ApprovalReviewView({ sheet, onClose, onChoose }: ApprovalReviewViewProps) {
  const state = sheet.state;
  if (state.phase === "ReviewIdle") return null;
  const status = sheet.answer?.text ?? (state.changedAtTap ? "Updated" : STATUS_TEXT[approvalStatus(state.found, state.verified, state.approval)]);
  const pending = state.found && state.verified && state.approval === "ApprovalPending";
  const actionable = state.found && state.verified && (state.approval === "ApprovalPending" || state.approval === "ApprovalRetryable");
  const busy = state.phase === "Rechecking" || state.phase === "Deciding" || state.phase === "ReadingRequest";
  return (
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="bottom" title={sheet.presentation?.heading ?? "Calendar change"}>
        <div className="flex flex-col gap-3 px-5 pb-6">
          <p role="status" aria-live="polite" className="text-sm">{busy ? "Checking request…" : status}</p>
          {sheet.presentation && (
            <dl aria-label="Event details" className="grid gap-1">
              {sheet.presentation.fields.map((field) => (
                <div key={field.label}><dt className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{field.label}</dt><dd className="whitespace-pre-wrap text-sm">{field.value}</dd></div>
              ))}
            </dl>
          )}
          {actionable && <p className="text-sm text-muted-foreground">{sheet.presentation?.complete ? "Dates and times are shown in this phone’s time zone." : "Current event details could not be verified. Decline this request or open Calendar and review the event before trying again."}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            {pending && <Button variant="outline" disabled={busy} onClick={() => onChoose("RejectChange")}>Decline</Button>}
            {actionable && <Button disabled={busy || !sheet.presentation?.complete} onClick={() => onChoose("ApproveChange")}>Approve</Button>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
