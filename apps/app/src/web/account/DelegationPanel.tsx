// spec/account/delegation.md, "Story: Let Cloud run my hosted results"
import { CircleCheck, Clock } from "lucide-react";
import { useState } from "react";
import { type Delegation, canCancelTap, canCheckStatus, canStartAuthorization } from "../../../gen/account__delegation.ts";
import type { DelegationDetails } from "../../account/delegation.vibe";
import { Button, Checkbox, Label, Spinner } from "../components/ui/index.ts";

export interface DelegationPanelProps {
  delegation: Delegation;
  details: DelegationDetails;
  onStart: (email: boolean, calendar: boolean) => void;
  onCheck: () => void;
  onCancel: () => void;
  onRevoke: (grantId: string) => void;
}

/**
 * Cloud's week-long delegation for hosted email and calendar results: authorize in the browser, check, cancel or revoke.
 * @model spec/account/delegation.md
 */
export function DelegationPanel({ delegation, details, onStart, onCheck, onCancel, onRevoke }: DelegationPanelProps) {
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
      {delegation.grant && details.grantId && <Button variant="ghost" onClick={() => onRevoke(details.grantId ?? "")}>Revoke</Button>}
      {details.pendingRevocations.length > 0 && <p role="status" className="text-warn">Off · retry</p>}
    </section>
  );
}
