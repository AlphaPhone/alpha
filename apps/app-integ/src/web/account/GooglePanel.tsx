// spec/account/google.md, "Story: Connect my Google account with the access I choose"; spec/account/google.md, "Story: Use and remove my Google access"; spec/account/agentAccess.md, "Story: Choose what the agent may change through Google"
import { CalendarDays, Mail, RotateCw } from "lucide-react";
import { useState } from "react";
import { type AccessField, type AgentAccess, canSubmit } from "../../../gen/account__agentAccess.ts";
import { type Capability, type Google, canAllowCalendar, canCancelWait, canConnect, canDisconnect, canReload } from "../../../gen/account__google.ts";
import type { GoogleAccount } from "../../account/google.vibe";
import { Button, ListRow, Spinner, Switch } from "../components/ui/index.ts";

/** The Google connection, its accounts, the agent's switches and the owner's actions on them. */
export interface GooglePanelProps {
  google: Google;
  accounts: ReadonlyArray<GoogleAccount>;
  access: AgentAccess;
  /** Ask Google for these capabilities. */
  onConnect: (capabilities: Capability[]) => void;
  onAllowCalendar: () => void;
  onCancel: () => void;
  onDisconnect: () => void;
  onReload: () => void;
  onAccess: (field: AccessField, value: boolean, expected: number) => void;
}

const first: Capability[] = ["GmailRead", "CalendarRead"];
const changes: Capability[] = ["GmailModify"];
const calendar: Capability[] = ["CalendarRead", "CalendarWrite"];

function accessLabel(google: Google): string {
  if (!google.readGrant) return "Not connected";
  return google.sendGrant ? "Read, change and send" : google.modifyGrant ? "Read and change" : "Read only";
}

/**
 * The managed Google connection: its accounts and access, consent, disconnect, and the agent's switches for Google changes.
 * @model spec/account/google.md
 */
export function GooglePanel({ google, accounts, access, onConnect, onAllowCalendar, onCancel, onDisconnect, onReload, onAccess }: GooglePanelProps) {
  const [confirming, setConfirming] = useState(false);
  const row = accounts[0];
  const waiting = google.phase === "GWaiting" || google.phase === "GRefreshing";
  const settled = access.phase === "AccessIdle";
  return (
    <section aria-label="Google" className="flex flex-col gap-4">
      {google.readPending && !waiting ? <Spinner label="Reading Google accounts" className="mx-auto" /> : (
        <ul>
          {row ? (
            <ListRow title={row.email ?? "Google account"} detail={accessLabel(google)} leading={<Mail aria-hidden />} />
          ) : <li className="text-muted-foreground">Not connected</li>}
          {google.calendarGrant && <ListRow title="Calendar" detail={google.calendarWrite ? "Read and edit" : "Read only"} leading={<CalendarDays aria-hidden />} />}
        </ul>
      )}
      {google.unverified && <p role="alert" className="text-destructive">Couldn’t read Google accounts</p>}
      {google.phase === "GDenied" && <p role="status">Google access not granted</p>}
      {google.outcome === "Disconnected" && <p role="status">Disconnected</p>}
      {google.outcome === "StillConnected" && <p role="alert" className="text-destructive">Still connected</p>}
      {google.outcome === "DisconnectUnconfirmed" && <p role="alert" className="text-warn">Disconnect not confirmed</p>}
      {waiting ? (
        <div className="flex items-center gap-3">
          <Spinner label="Waiting for Google" />
          <Button variant="ghost" disabled={!canCancelWait(google)} onClick={onCancel}>Cancel</Button>
        </div>
      ) : google.panel === "CalendarPanel" ? (
        google.choice ? (
          <div className="flex flex-col gap-2">
            <p>Let your agent edit this Calendar?</p>
            <Button disabled={!canAllowCalendar(google)} onClick={onAllowCalendar}>Allow and connect</Button>
          </div>
        ) : <Button disabled={!canConnect(google, calendar)} onClick={() => onConnect(calendar)}>{google.calendarGrant ? "Update Calendar access" : "Connect Google Calendar"}</Button>
      ) : google.choice ? (
        <div className="flex flex-col gap-2">
          <p>Let your agent edit your Calendar?</p>
          <Button disabled={!canAllowCalendar(google)} onClick={onAllowCalendar}>Allow and connect</Button>
        </div>
      ) : (
        <Button disabled={!canConnect(google, google.readGrant ? changes : first)} onClick={() => onConnect(google.readGrant ? changes : first)}>{google.readGrant ? "Allow mailbox changes" : "Connect Google"}</Button>
      )}
      {google.account !== 0 && (
        confirming ? (
          <div className="flex flex-col gap-2">
            <p>Mail stays in Google. Alpha loses access.</p>
            <div className="flex gap-2">
              <Button variant="destructive" disabled={!canDisconnect(google)} onClick={() => { setConfirming(false); onDisconnect(); }}>Disconnect</Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>Keep</Button>
            </div>
          </div>
        ) : <Button variant="ghost" loading={google.phase === "GDisconnecting"} disabled={!canDisconnect(google)} onClick={() => setConfirming(true)}>Disconnect Google</Button>
      )}
      <Button variant="ghost" size="sm" className="self-start" disabled={!canReload(google)} onClick={onReload}><RotateCw aria-hidden />Refresh</Button>
      <fieldset className="flex flex-col gap-3" aria-label="Agent access through Google">
        {([["GmailChanges", "Gmail changes", access.saved.gmailChanges], ["CalendarEdits", "Calendar edits", access.saved.calendarEdits]] as const).map(([field, label, on]) => (
          <label key={field} className="flex items-center justify-between gap-3">
            <span>{label}</span>
            <Switch checked={on} disabled={!settled || !canSubmit(access, { field, value: !on, expected: access.revision })} onCheckedChange={(value) => onAccess(field, value, access.revision)} />
          </label>
        ))}
        {access.hostUnconfirmed && settled && <p role="status" className="text-warn">Not confirmed on this phone</p>}
      </fieldset>
    </section>
  );
}
