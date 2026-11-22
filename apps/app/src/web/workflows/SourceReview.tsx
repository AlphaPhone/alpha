// spec/workflows/digestSources.md, "Story: Let my digest read Google through Cloud only as I authorized"; spec/workflows/digestSources.md, "Story: Let my digest read my phone's Calendar and reminders only with my consent"
import { useState } from "react";
import type { Sources } from "../../../gen/workflows__digestSources.ts";
import { Alert, Button, Checkbox, Label, Sheet, SheetContent } from "../components/ui/index.ts";

export interface SourceReviewProps {
  open: boolean;
  sources: Sources;
  /** Whether this build can ask the phone for consent: only on the phone. */
  onPhone: boolean;
  can: { readonly startGrant: boolean; readonly approve: boolean; readonly cancel: boolean; readonly consent: boolean; readonly revokeConsent: boolean };
  onOpenChange: (open: boolean) => void;
  onStartGrant: (email: boolean, calendar: boolean) => void;
  onApprove: () => void;
  onCancel: () => void;
  onConsent: (calendar: boolean, reminders: boolean) => void;
  onRevokeConsent: () => void;
}

/**
 * What a digest may read: the phone's Calendar and reminders under consent, or Google through a Cloud read grant, each for a week at most.
 * @model spec/workflows/digestSources.md
 * @design design.md
 */
export function SourceReview({ open, sources, onPhone, can, onOpenChange, onStartGrant, onApprove, onCancel, onConsent, onRevokeConsent }: SourceReviewProps) {
  const [email, setEmail] = useState(false);
  const [calendar, setCalendar] = useState(true);
  const [reminders, setReminders] = useState(true);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" title="Digest sources">
        <div className="flex flex-col gap-4 px-5 pb-5">
          {onPhone && (
            <fieldset className="flex flex-col gap-2">
              <legend className="font-mono text-xs uppercase text-muted-foreground">This phone</legend>
              <Label className="flex items-center gap-2"><Checkbox checked={calendar} onCheckedChange={(v) => setCalendar(v === true)} />Calendar</Label>
              <Label className="flex items-center gap-2"><Checkbox checked={reminders} onCheckedChange={(v) => setReminders(v === true)} />Reminders</Label>
              <p className="text-sm text-muted-foreground">Read once a day for a week and sent to your agent’s model.</p>
              {sources.consent === "ConsentApproved" ? (
                <Button size="lg" variant="ghost" disabled={!can.revokeConsent} onClick={onRevokeConsent}>Revoke</Button>
              ) : (
                <Button size="lg" disabled={!can.consent || (!calendar && !reminders)} onClick={() => onConsent(calendar, reminders)}>Allow for a week</Button>
              )}
              {sources.consent === "ConsentRefused" && <Alert variant="warn" role="status">This phone didn’t allow the read.</Alert>}
            </fieldset>
          )}
          <fieldset className="flex flex-col gap-2">
            <legend className="font-mono text-xs uppercase text-muted-foreground">Google through Cloud</legend>
            <Label className="flex items-center gap-2"><Checkbox checked={email} onCheckedChange={(v) => setEmail(v === true)} />Mail</Label>
            <Label className="flex items-center gap-2"><Checkbox checked={calendar} onCheckedChange={(v) => setCalendar(v === true)} />Calendar</Label>
            {sources.authorization === "Reviewing" ? (
              <div className="flex gap-2">
                <Button size="lg" disabled={!can.approve} onClick={onApprove}>Approve read access</Button>
                <Button size="lg" variant="ghost" disabled={!can.cancel} onClick={onCancel}>Cancel</Button>
              </div>
            ) : (
              <Button size="lg" variant="outline" disabled={!can.startGrant || (!email && !calendar)} onClick={() => onStartGrant(email, calendar)}>Review Cloud read access</Button>
            )}
            {sources.authorization === "Granted" && <Alert variant="ok" role="status">Read access lasts a week.</Alert>}
            {sources.authorization === "AuthorizationFailed" && <Alert variant="warn" role="status">This request expired or was cancelled.</Alert>}
          </fieldset>
        </div>
      </SheetContent>
    </Sheet>
  );
}
