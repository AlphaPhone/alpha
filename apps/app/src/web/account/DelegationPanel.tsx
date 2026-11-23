// spec/account/delegation.md, "Story: Let Cloud run my hosted results"; spec/account/delegation.md, "Removing the grant is reviewed with what reads through it, and only a pending disconnect is retried as it is"
import { CircleCheck, Clock, RotateCw } from "lucide-react";
import { useState } from "react";
import { type Delegation, canCancelTap, canCheckStatus, canStartAuthorization } from "../../../gen/account__delegation.ts";
import type { DelegationDetails } from "../../account/delegation.vibe";
import { Button, Checkbox, Label, Spinner } from "../components/ui/index.ts";

/** The Cloud delegation for hosted results and the owner's actions on it. */
export interface DelegationPanelProps {
  delegation: Delegation;
  details: DelegationDetails;
  onStart: (email: boolean, calendar: boolean) => void;
  onCheck: () => void;
  onCancel: () => void;
  /** Open the review of what stops reading when this grant is removed. */
  onReviewRemoval: (grantId: string) => void;
  /** Retry the Cloud disconnect of a grant whose local reads are already off. */
  onRetryDisconnect: (grantId: string) => void;
}

/**
 * Cloud's week-long delegation for hosted email and calendar results: authorize in the browser, check, cancel or revoke.
 * @model spec/account/delegation.md
 */
export function DelegationPanel({ delegation, details, onStart, onCheck, onCancel, onReviewRemoval, onRetryDisconnect }: DelegationPanelProps) {
  const [email, setEmail] = useState(details.email);
  const [calendar, setCalendar] = useState(details.calendar);
  const busy = delegation.running !== "NoStep";
  const status = delegation.grant ? "Connected"
    : delegation.record === "FinishingRecord" ? (delegation.cloud === "CloudFinishing" ? "Finishing" : "Unconfirmed")
    : delegation.record === "WaitingRecord" ? (delegation.recordExpired ? "Expired" : "Waiting for browser")
    : delegation.retained === "OtherReturn" ? "Wrong account" : "Expires in 7 days";
  return (
    <section aria-label="Hosted results" className="flex flex-col gap-3">
      <p role="status" className="flex items-center gap-2">
        {busy ? <Spinner size="sm" aria-hidden /> : delegation.grant ? <CircleCheck aria-hidden className="size-4 text-ok" /> : <Clock aria-hidden className="size-4" />}
        {status}
      </p>
      {delegation.record === "NoRecord" && !delegation.grant && (
        <>
          <Label className="flex items-center gap-2"><Checkbox checked={email} onCheckedChange={(value) => setEmail(value === true)} />Email</Label>
          <Label className="flex items-center gap-2"><Checkbox checked={calendar} onCheckedChange={(value) => setCalendar(value === true)} />Calendar</Label>
          <Button disabled={!canStartAuthorization(delegation) || (!email && !calendar)} onClick={() => onStart(email, calendar)}>Authorize in browser</Button>
        </>
      )}
      {delegation.record !== "NoRecord" && (
        <div className="flex gap-2">
          <Button variant="outline" disabled={!canCheckStatus(delegation)} onClick={onCheck}>Check status</Button>
          <Button variant="ghost" disabled={!canCancelTap(delegation)} onClick={onCancel}>Cancel</Button>
        </div>
      )}
      {delegation.grant && details.grantId && <Button variant="ghost" disabled={busy} onClick={() => onReviewRemoval(details.grantId ?? "")}>Review removal</Button>}
      {details.pendingRevocations.filter((id) => id !== details.grantId).map((id) => (
        <div key={id} className="flex items-center justify-between gap-2">
          <p role="status" className="text-warn">Disconnect pending</p>
          <Button variant="ghost" size="icon" aria-label="Retry Cloud disconnect" disabled={busy} onClick={() => onRetryDisconnect(id)}><RotateCw aria-hidden /></Button>
        </div>
      ))}
    </section>
  );
}
