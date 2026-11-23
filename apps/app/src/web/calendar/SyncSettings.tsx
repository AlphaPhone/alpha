// spec/calendar/sync.md, "Story: Sync only with my consent for what I reviewed"; spec/calendar/sync.md, "Sync status words follow the readback, never the request"; spec/calendar/googleLink.md, "Story: Link a Google calendar I can write to, and be told it is synced only when it is"
import { RefreshCw } from "lucide-react";
import type { GoogleGrant } from "../../../gen/calendar__googleLink.ts";
import { syncWord } from "../../../gen/calendar__sync.ts";
import { CalendarSync, type SyncDestination } from "../../calendar/sync.vibe";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from "../components/ui/index.ts";
import { useSyncView, run } from "./hooks.ts";

const WORDS = { SyncOff: "Off", SyncOn: "On", SyncSynced: "Synced", SyncNeedsReview: "Needs review", SyncPaused: "Paused" } as const;

/** The Google grant and writable calendars the account area verified for sync. */
export type SyncSettingsProps = {
  /** The Google account's grant, as the account area verified it. */
  grant: GoogleGrant;
  /** The owner's writable Google calendars, as the account area listed them. */
  destinations: readonly SyncDestination[];
};

/**
 * Google Calendar sync: the destination, the reviewed switch and the status from the last readback.
 * @model spec/calendar/sync.md
 */
export function SyncSettings({ grant, destinations }: SyncSettingsProps) {
  const view = useSyncView();
  const control = view.control;
  const conflicts = (view.links ?? []).filter((link) => link.state === "conflicted" || link.state === "quarantined").length + (view.review?.conflicts ?? 0);
  const word = syncWord(control.consent, view.review?.paused ?? true, view.review?.pendingDispatch != null, view.links !== undefined, conflicts);
  const saved = view.review?.destination;
  const savedKey = saved ? `${saved.connectorAccountId}/${saved.providerCalendarId}` : "";
  const reviewing = control.consentReviewed && !control.consent;
  return (
    <section aria-label="Google Calendar sync" className="flex flex-col gap-3 px-4 py-3">
      <p className="text-sm text-muted-foreground">Google gets event details and guests.</p>
      <Select value={savedKey} disabled={!(view.review?.paused ?? true) || view.review?.pendingDispatch != null}
        onValueChange={(key) => {
          const destination = destinations.find((candidate) => `${candidate.connectorAccountId}/${candidate.providerCalendarId}` === key);
          if (destination) void run(CalendarSync.use((sync) => sync.change("SelectDestination", destination)));
        }}>
        <SelectTrigger aria-label="Google Calendar destination"><SelectValue placeholder="Choose a Google calendar" /></SelectTrigger>
        <SelectContent>{destinations.map((candidate) => (
          <SelectItem key={`${candidate.connectorAccountId}/${candidate.providerCalendarId}`} value={`${candidate.connectorAccountId}/${candidate.providerCalendarId}`}>{`${candidate.account || "Google account"} · ${candidate.name}`}</SelectItem>
        ))}</SelectContent>
      </Select>
      <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
        {reviewing ? "Confirm sync" : "Sync"}
        <Switch checked={control.consent} aria-label={reviewing ? "Confirm sync" : "Sync"} onCheckedChange={(on) => void run(CalendarSync.use((sync) => {
          if (!on) return sync.withdrawConsent();
          return reviewing ? sync.giveConsent() : sync.reviewConsent();
        }))} />
      </label>
      <div className="flex items-center justify-between text-sm">
        <span role="status">{WORDS[word]}</span>
        <Button variant="ghost" size="icon" aria-label="Review sync" onClick={() => void run(CalendarSync.use((sync) => sync.review()))}><RefreshCw /></Button>
      </div>
      {grant === "WriteGrant" && saved === undefined && (
        <Button variant="secondary" onClick={() => void run(CalendarSync.use((sync) => sync.link(grant, destinations)))}>Choose Google calendar</Button>
      )}
      {view.review?.pendingDispatch != null && <Button variant="outline" aria-label="Check pending operation" onClick={() => void run(CalendarSync.use((sync) => sync.change("RecoverDispatch")))}>Check</Button>}
    </section>
  );
}
