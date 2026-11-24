// spec/workflows/digestSources.md, "Story: Let my digest read Google through Cloud only as I authorized"; spec/workflows/digestSources.md, "Story: Let my digest read my phone's Calendar and reminders only with my consent"; spec/workflows/digestSources.md, "Story: Renew my phone source before its week ends"
import { useState } from "react";
import { phoneSourceProblem, type Sources } from "../../../gen/workflows__digestSources.ts";
import type { ImpactRow, PhoneCalendars, PhoneSourceChoice } from "../../workflows/sources.vibe";
import { Alert, Button, Checkbox, Input, Label, ListRow, Sheet, SheetContent } from "../components/ui/index.ts";
import { ReviewDialog } from "./ReviewDialog.tsx";
import { phoneCalendarWords, phoneSourceWords, when } from "./words.ts";

/** A saved phone source the sheet offers to renew or revoke. */
export interface PhoneSourceRow { readonly id: string; readonly label: string; readonly expiresAt: number; readonly revoked: boolean }

/** What the digest sources sheet shows and offers. */
export interface SourceReviewProps {
  open: boolean;
  sources: Sources;
  /** Whether this build can ask the phone for consent: only on the phone. */
  onPhone: boolean;
  /** The phone's calendars as last listed, once the owner asked to choose them. */
  calendars?: PhoneCalendars;
  /** The saved phone sources, newest first. */
  phoneSources: ReadonlyArray<PhoneSourceRow>;
  /** The phone source a renewal reminder opened this sheet for. */
  renewing?: string;
  /** What removing Google access would stop, while its review is open. */
  impact?: ReadonlyArray<ImpactRow>;
  /** What the last phone-source save or Google removal said. */
  outcome?: string;
  can: { readonly startGrant: boolean; readonly approve: boolean; readonly cancel: boolean; readonly consent: boolean; readonly revokeConsent: boolean; readonly revokeGrant: boolean };
  onOpenChange: (open: boolean) => void;
  onStartGrant: (email: boolean, calendar: boolean) => void;
  onApprove: () => void;
  onCancel: () => void;
  onChooseCalendars: () => void;
  onAllow: (choice: PhoneSourceChoice) => void;
  onRenew: (sourceId: string) => void;
  onRevokeConsent: (sourceId: string) => void;
  onReviewRevoke: () => void;
  onRevokeGrant: (reviewed: ReadonlyArray<ImpactRow>) => void;
  onCloseRevoke: () => void;
}

/**
 * What a digest may read: phone calendars and reminders under the phone's consent, or Google through a Cloud read grant, each for a week at most.
 * @model spec/workflows/digestSources.md
 * @design design.md
 */
export function SourceReview({
  open, sources, onPhone, calendars, phoneSources, renewing, impact, outcome, can, onOpenChange, onStartGrant, onApprove, onCancel,
  onChooseCalendars, onAllow, onRenew, onRevokeConsent, onReviewRevoke, onRevokeGrant, onCloseRevoke,
}: SourceReviewProps) {
  const [email, setEmail] = useState(false);
  const [googleCalendar, setGoogleCalendar] = useState(true);
  const [name, setName] = useState("");
  const [chosen, setChosen] = useState<ReadonlyArray<string>>([]);
  const [reminders, setReminders] = useState(true);
  const [hours, setHours] = useState(168);
  const [reviewing, setReviewing] = useState(false);
  const offered = calendars?.status === "ready" ? calendars.calendars : [];
  const missing = chosen.filter((id) => !offered.some((c) => c.id === id)).length;
  const problem = phoneSourceProblem(name.trim().length, chosen.length, missing, reminders, hours);
  const choice: PhoneSourceChoice = { name, calendarIds: chosen, reminders, hours, ...(renewing === undefined ? {} : { renews: renewing }) };
  const renewed = phoneSources.find((s) => s.id === renewing);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" title="Digest sources">
        <div className="flex flex-col gap-4 px-5 pb-5">
          {outcome !== undefined && <Alert role="status" className="text-sm">{outcome}</Alert>}
          {onPhone && (
            <fieldset className="flex flex-col gap-2">
              <legend className="font-mono text-xs uppercase text-muted-foreground">{renewed === undefined ? "This phone" : `Renew ${renewed.label}`}</legend>
              <Label htmlFor="phone-source-name">Source name</Label>
              <Input id="phone-source-name" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
              <Button size="lg" variant="outline" onClick={onChooseCalendars}>Choose calendars</Button>
              {calendars !== undefined && calendars.status !== "ready" && <Alert variant="warn" role="status">{phoneCalendarWords[calendars.status]}</Alert>}
              {offered.map((c) => (
                <Label key={c.id} className="flex items-center gap-2">
                  <Checkbox checked={chosen.includes(c.id)} onCheckedChange={(v) => setChosen((ids) => (v === true ? [...ids.filter((id) => id !== c.id), c.id] : ids.filter((id) => id !== c.id)))} />
                  {c.name} · {c.account}
                </Label>
              ))}
              <Label className="flex items-center gap-2"><Checkbox checked={reminders} onCheckedChange={(v) => setReminders(v === true)} />Reminders due today and overdue</Label>
              <Label htmlFor="phone-source-hours">Hours until it expires</Label>
              <Input id="phone-source-hours" type="number" inputMode="numeric" min={1} max={168} value={hours} onChange={(e) => setHours(Math.trunc(Number(e.target.value)))} />
              {problem !== "PhoneSourceReady" && <p className="text-sm text-muted-foreground">{phoneSourceWords[problem]}</p>}
              <Button size="lg" disabled={!can.consent || problem !== "PhoneSourceReady"} onClick={() => setReviewing(true)}>Review phone source</Button>
              {phoneSources.length > 0 && (
                <ul aria-label="Phone sources" className="flex flex-col">
                  {phoneSources.map((s) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <ListRow className="flex-1" title={s.label} detail={s.revoked ? "Revoked" : `Until ${when(s.expiresAt)}`} />
                      {!s.revoked && <Button size="sm" variant="outline" onClick={() => onRenew(s.id)}>Renew</Button>}
                      {!s.revoked && <Button size="sm" variant="ghost" disabled={!can.revokeConsent} onClick={() => onRevokeConsent(s.id)}>Revoke</Button>}
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>
          )}
          <fieldset className="flex flex-col gap-2">
            <legend className="font-mono text-xs uppercase text-muted-foreground">Google through Cloud</legend>
            <Label className="flex items-center gap-2"><Checkbox checked={email} onCheckedChange={(v) => setEmail(v === true)} />Mail</Label>
            <Label className="flex items-center gap-2"><Checkbox checked={googleCalendar} onCheckedChange={(v) => setGoogleCalendar(v === true)} />Calendar</Label>
            {sources.authorization === "Reviewing" ? (
              <div className="flex gap-2">
                <Button size="lg" disabled={!can.approve} onClick={onApprove}>Approve read access</Button>
                <Button size="lg" variant="ghost" disabled={!can.cancel} onClick={onCancel}>Cancel</Button>
              </div>
            ) : (
              <Button size="lg" variant="outline" disabled={!can.startGrant || (!email && !googleCalendar)} onClick={() => onStartGrant(email, googleCalendar)}>Review Cloud read access</Button>
            )}
            {sources.authorization === "Granted" && (
              <>
                <Alert variant="ok" role="status">Read access lasts a week.</Alert>
                <Button size="lg" variant="ghost" disabled={!can.revokeGrant} onClick={onReviewRevoke}>Remove Google access</Button>
              </>
            )}
            {sources.authorization === "AuthorizationFailed" && <Alert variant="warn" role="status">This request expired or was cancelled.</Alert>}
          </fieldset>
        </div>
        <ReviewDialog open={reviewing} title={renewed === undefined ? "Allow this phone source?" : `Renew ${renewed.label}?`} confirm="Allow"
          disabled={problem !== "PhoneSourceReady"} onCancel={() => setReviewing(false)}
          onConfirm={() => { setReviewing(false); onAllow(choice); }}>
          <p>Calendars: {offered.filter((c) => chosen.includes(c.id)).map((c) => `${c.name} (${c.account})`).join(", ") || "none"}. Reminders: {reminders ? "open reminders due today and overdue" : "excluded"}.</p>
          <p className="text-sm text-muted-foreground">It reads only event titles and times and reminder titles, due times and status, up to 200 items, for {hours} hours. Your agent’s model receives what it reads.</p>
        </ReviewDialog>
        <ReviewDialog open={impact !== undefined} title="Remove Google access?" confirm="Remove" destructive disabled={!can.revokeGrant}
          onCancel={onCloseRevoke} onConfirm={() => onRevokeGrant(impact ?? [])}>
          {impact !== undefined && impact.length === 0 && <p>No saved source or digest reads through Google.</p>}
          {impact !== undefined && impact.length > 0 && (
            <ul className="flex flex-col gap-1">
              {impact.map((row) => <li key={`${row.kind}:${row.id}`}>{row.kind === "source" ? "Source" : "Digest"}: {row.label}</li>)}
            </ul>
          )}
        </ReviewDialog>
      </SheetContent>
    </Sheet>
  );
}
