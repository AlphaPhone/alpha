// spec/calendar/deviceSync.md, "Story: Sync my phone's calendar only with the Google calendar I chose, for the account I use"; spec/calendar/deviceSync.md, "The owner may choose only a calendar it can write, of a Google account that granted Calendar changes"; spec/calendar/nativeSync.md, "Story: Turn device sync on only through Android's consent, and off for every review at once"
import { CalendarDays, RefreshCw } from "lucide-react";
import { DeviceCalendarSync, type DeviceSyncView } from "../../calendar/deviceSync.vibe";
import type { SyncSelectionRecord } from "../../calendar/deviceSync.schema.vibe";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from "../components/ui/index.ts";
import { cn } from "../lib/cn.ts";
import { perform } from "../shell/services.ts";
import { useDeviceSyncView } from "./hooks.ts";

const keyOf = (row: SyncSelectionRecord) => `${row.connectionId}/${row.providerCalendarId}`;
const labelOf = (row: SyncSelectionRecord) => (row.name === row.account ? row.name : `${row.name} · ${row.account}`);

/** What the device sync panel shows and the owner's controls on it. */
export type DeviceSyncPanelProps = {
  /** Device sync as the service publishes it. */
  view: DeviceSyncView;
  /** List the Google calendars the owner may choose. */
  onOffer: () => void;
  /** Keep the chosen calendar for this account. */
  onChoose: (selection: SyncSelectionRecord) => void;
  /** Review the destination and every local event. */
  onReview: () => void;
  /** Enable what was reviewed, through Android's consent. */
  onEnable: () => void;
  /** Run one pass now. */
  onSync: () => void;
  /** Turn sync off, keeping saved events and links. */
  onPause: () => void;
};

/**
 * Device Google Calendar sync: the chosen calendar, one switch that reviews, confirms and pauses, Sync now and the host's status line.
 * @model spec/calendar/deviceSync.md
 */
export function DeviceSyncPanel({ view, onOffer, onChoose, onReview, onEnable, onSync, onPause }: DeviceSyncPanelProps) {
  const on = view.enabled || view.running;
  const confirming = !on && view.reviewed !== undefined;
  const chosen = view.selection === undefined ? "" : keyOf(view.selection);
  const offered = view.offered ?? [];
  const detail = view.enabled && view.destination.account !== "" && view.destination.calendar !== ""
    ? `${view.destination.account} · ${view.destination.calendar}`
    : confirming ? `${view.destination.account} · ${view.destination.calendar} · ${view.reviewed} event${view.reviewed === 1 ? "" : "s"}` : "";
  return (
    <section aria-label="Phone calendar sync" className="flex flex-col gap-3 px-4 py-3">
      <p className="font-mono text-xs uppercase text-muted-foreground">This phone</p>
      <p className="text-sm text-muted-foreground">Google gets event details and guests.</p>
      <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm">
        <span aria-hidden className={cn("size-2 rounded-full", view.running ? "bg-warn" : view.enabled ? "bg-ok" : "bg-muted-foreground")} />
        {view.status}
      </p>
      <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
        {confirming ? "Confirm sync" : "Sync"}
        <Switch checked={on} aria-label={confirming ? "Confirm sync" : "Sync"} disabled={on ? false : view.running || !view.ready}
          onCheckedChange={() => (on ? onPause() : confirming ? onEnable() : onReview())} />
      </label>
      {detail !== "" && <p className="text-sm">{detail}</p>}
      {!view.enabled && (offered.length > 0 ? (
        <Select value={chosen} disabled={view.running}
          onValueChange={(key) => {
            const row = offered.find((candidate) => keyOf(candidate) === key);
            if (row !== undefined) onChoose(row);
          }}>
          <SelectTrigger aria-label="Google calendar for sync"><SelectValue placeholder="Choose a Google calendar" /></SelectTrigger>
          <SelectContent>{offered.map((row) => <SelectItem key={keyOf(row)} value={keyOf(row)}>{labelOf(row)}</SelectItem>)}</SelectContent>
        </Select>
      ) : (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span>{view.selection === undefined ? (view.offered === undefined ? "" : "No writable calendar") : labelOf(view.selection)}</span>
          <Button variant="secondary" disabled={view.running} aria-label="Choose Google calendar" onClick={onOffer}><CalendarDays />Calendar</Button>
        </div>
      ))}
      {view.enabled && (
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" aria-label="Sync now" disabled={view.running} onClick={onSync}><RefreshCw /></Button>
        </div>
      )}
    </section>
  );
}

/** The device sync panel over the DeviceCalendarSync service; nothing shows on a build without a device calendar. */
export function DeviceSyncSettings() {
  const view = useDeviceSyncView();
  if (!view.available) return null;
  return (
    <DeviceSyncPanel view={view}
      onOffer={() => void perform(DeviceCalendarSync.use((sync) => sync.offer()))}
      onChoose={(selection) => void perform(DeviceCalendarSync.use((sync) => sync.choose(selection)))}
      onReview={() => void perform(DeviceCalendarSync.use((sync) => sync.review()))}
      onEnable={() => void perform(DeviceCalendarSync.use((sync) => sync.enable()))}
      onSync={() => void perform(DeviceCalendarSync.use((sync) => sync.sync()))}
      onPause={() => void perform(DeviceCalendarSync.use((sync) => sync.pause()))} />
  );
}
