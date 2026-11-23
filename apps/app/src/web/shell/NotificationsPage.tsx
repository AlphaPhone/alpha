// spec/clock/mirror.md, "Story: Choose which apps Alpha may mirror"; spec/clock/mirror.md, "Story: Know whether Alpha's own notices can reach me"
import { Effect } from "effect";
import { Bell, BellOff, Plus, X } from "lucide-react";
import { useState } from "react";
import { useMachine as useMirror } from "../../../gen/clock__mirror.react.ts";
import type { Mirror as MirrorState, MirrorReport } from "../../../gen/clock__mirror.ts";
import { canHistoryClearAnswered, canResumeRequested, canSaveRequested, collecting, initial as mirrorStart, maxApps } from "../../../gen/clock__mirror.ts";
import { Mirror } from "../../clock/mirror.vibe";
import { Native } from "../../platform/native.vibe";
import { Button, Card, EmptyState, ListRow, Separator, Switch } from "../components/ui/index.ts";
import { runtime } from "../runtime.ts";
import { act, answer } from "./services.ts";

/** One app the owner may add to the mirror. */
export interface MirrorChoice {
  readonly packageName: string;
  readonly label: string;
}

/** One row of the private one-day history: app, time and state only. */
export interface MirrorHistoryRow {
  readonly id: string;
  readonly appLabel: string;
  readonly at: number;
  readonly state: string;
}

const REPORTS: Readonly<Record<MirrorReport, string>> = {
  NoMirrorReport: "",
  SettingsChanged: "These settings changed on the phone. Review them, then try again.",
  MirrorSaved: "Saved.",
  HistoryCleared: "History cleared.",
  HistoryNotCleared: "History couldn’t be confirmed cleared.",
  MirrorUnavailable: "Notification settings are unavailable on this phone.",
};

/** What Alpha's own notices can do now, in the owner's words: on, some off, or off. */
export function deliveryWord(mirror: MirrorState): "On" | "Some off" | "Off" {
  if (!mirror.appEnabled) return "Off";
  return mirror.remindersBlocked ? "Some off" : "On";
}

/** The notifications page's state and the owner's changes on it. */
export interface NotificationsPageProps {
  /** The mirror and delivery state as the phone last reported it. */
  mirror: MirrorState;
  /** The apps the owner may add, once asked for. */
  choices?: readonly MirrorChoice[];
  /** The one-day history, once asked for. */
  history?: readonly MirrorHistoryRow[];
  /** Opens Android's notification settings for Alpha's own channels. */
  onOpenChannels: () => void;
  /** Opens Android's notification access page for the mirror. */
  onOpenAccess: () => void;
  /** Turns the mirror on or off. */
  onMirror: (enabled: boolean) => void;
  /** Turns the one-day history on or off. */
  onKeepHistory: (history: boolean) => void;
  /** Shows or hides an app's previews. */
  onPreview: (packageName: string, preview: boolean) => void;
  /** Stops mirroring one app. */
  onRemove: (packageName: string) => void;
  /** Starts mirroring one app. */
  onAdd: (packageName: string) => void;
  /** Lists the apps the owner may add. */
  onShowChoices: () => void;
  /** Reads the one-day history. */
  onShowHistory: () => void;
  /** Clears the one-day history. */
  onClearHistory: () => void;
  /** Resumes a paused mirror. */
  onResume: () => void;
}

const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

/**
 * Notifications: whether Alpha's own notices can reach the owner, and which other apps' notifications Alpha may show,
 * with their previews and a private one-day history. Every change names the settings revision on screen.
 * @model spec/clock/mirror.md
 */
export function NotificationsPage(props: NotificationsPageProps) {
  const { mirror, choices, history } = props;
  const apps = mirror.apps;
  const chosen = new Set(apps.map((app) => app.packageName));
  const labelOf = (packageName: string) => choices?.find((choice) => choice.packageName === packageName)?.label ?? packageName;
  const canChange = (next: typeof apps) => canSaveRequested(mirror, mirror.revision, next);
  const addable = (choices ?? []).filter((choice) => !chosen.has(choice.packageName));
  const report = REPORTS[mirror.report];
  const word = deliveryWord(mirror);
  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-3">
          {word === "On" ? <Bell aria-hidden className="size-5" /> : <BellOff aria-hidden className="size-5" />}
          <span className="flex-1">Alpha’s notices</span>
          <span role="status" className={word === "On" ? "font-mono text-xs uppercase tracking-widest text-ok" : "font-mono text-xs uppercase tracking-widest text-warn"}>{word}</span>
        </div>
        {word !== "On" && <p className="text-sm text-muted-foreground">{word === "Off" ? "Android won’t show Alpha’s notices." : "Reminder alerts are off in Android."}</p>}
        <Button variant="secondary" onClick={props.onOpenChannels}>Notification settings</Button>
      </Card>

      <Card className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-3">
          <span className="flex-1">Show other apps’ notifications</span>
          <Switch aria-label="Show other apps’ notifications" checked={mirror.enabled} disabled={!canChange(apps)} onCheckedChange={props.onMirror} />
        </div>
        {!mirror.granted && (
          <div className="flex items-center gap-3">
            <p className="flex-1 text-sm text-muted-foreground">Android hasn’t given Alpha notification access.</p>
            <Button size="sm" variant="secondary" onClick={props.onOpenAccess}>Allow access</Button>
          </div>
        )}
        {mirror.paused && (
          <div className="flex items-center gap-3">
            <p role="status" className="flex-1 text-sm text-warn">Paused</p>
            <Button size="sm" disabled={!canResumeRequested(mirror, mirror.revision)} onClick={props.onResume}>Resume</Button>
          </div>
        )}
        {mirror.loaded && collecting(mirror) && <p className="text-sm text-muted-foreground">Mirrored notifications stay on this phone.</p>}
      </Card>

      <section aria-label="Apps" className="flex flex-col">
        <h2 className="px-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">Apps · {apps.length} of {maxApps}</h2>
        {apps.length === 0 && <EmptyState title="No apps chosen" />}
        {apps.map((app) => (
          <div key={app.packageName} className="flex min-h-14 items-center gap-3 px-4 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate">{labelOf(app.packageName)}</span>
              <span className="block truncate text-sm text-muted-foreground">{app.available ? (app.preview ? "Previews shown" : "Previews hidden") : "Not on this phone"}</span>
            </span>
            <Switch aria-label={`Previews from ${labelOf(app.packageName)}`} checked={app.preview} disabled={!canChange(apps)} onCheckedChange={(preview) => props.onPreview(app.packageName, preview)} />
            <Button size="icon" variant="ghost" aria-label={`Stop showing ${labelOf(app.packageName)}`} disabled={!canChange(apps.filter((each) => each.packageName !== app.packageName))} onClick={() => props.onRemove(app.packageName)}><X aria-hidden /></Button>
          </div>
        ))}
        {choices === undefined ? (
          <Button variant="ghost" disabled={apps.length >= maxApps} onClick={props.onShowChoices}><Plus aria-hidden />Add an app</Button>
        ) : addable.map((choice) => (
          <ListRow key={choice.packageName} title={choice.label} leading={<Plus aria-hidden className="size-5" />} disabled={!canChange([...apps, { packageName: choice.packageName, preview: false, available: true }])} onClick={() => props.onAdd(choice.packageName)} />
        ))}
      </section>

      <Separator />

      <section aria-label="History" className="flex flex-col gap-2">
        <div className="flex items-center gap-3 px-4">
          <span className="flex-1">Keep a one-day history</span>
          <Switch aria-label="Keep a one-day history" checked={mirror.history} disabled={!canChange(apps)} onCheckedChange={props.onKeepHistory} />
        </div>
        {mirror.history && (history === undefined ? (
          <Button variant="ghost" onClick={props.onShowHistory}>Show history</Button>
        ) : (
          <>
            {history.length === 0 && <EmptyState title="Nothing in the last day" />}
            <ol className="flex flex-col">
              {history.map((row) => (
                <li key={row.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{row.appLabel}</span>
                    <span className="block truncate text-sm text-muted-foreground">{row.state}</span>
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums">{time.format(row.at)}</span>
                </li>
              ))}
            </ol>
            <Button variant="secondary" disabled={!canHistoryClearAnswered(mirror, true)} onClick={props.onClearHistory}>Clear history</Button>
          </>
        ))}
      </section>

      {report !== "" && <p role="status" className="px-4 text-sm text-muted-foreground">{report}</p>}
    </div>
  );
}

/** The connected notifications page takes nothing: it reads Clock's mirror from the one app runtime. */
export type NotificationsSettingsProps = Record<string, never>;

const mirrorDo = (f: (m: Mirror.Shape) => Effect.Effect<void>) => act(Effect.flatMap(Effect.service(Mirror), f));

/**
 * The notifications page over Clock's mirror, read again each time it opens; Settings mounts it for its Notifications row.
 * @model spec/clock/mirror.md
 */
export function NotificationsSettings() {
  const mirror = useMirror(runtime).state ?? mirrorStart;
  const [choices, setChoices] = useState<readonly MirrorChoice[] | undefined>(undefined);
  const [history, setHistory] = useState<readonly MirrorHistoryRow[] | undefined>(undefined);
  useState(() => mirrorDo((m) => m.refresh()));
  const apps = mirror.apps.map(({ packageName, preview }) => ({ packageName, preview }));
  return (
    <NotificationsPage
      mirror={mirror}
      choices={choices}
      history={history}
      onOpenChannels={() => act(Effect.flatMap(Effect.service(Native), (n) => Effect.catch(Effect.asVoid(n.invoke("AlphaDevice", "openSettings", { page: "notifications" })), () => Effect.void)))}
      onOpenAccess={() => mirrorDo((m) => m.openAccess())}
      onMirror={(enabled) => mirrorDo((m) => m.save({ enabled }))}
      onKeepHistory={(keep) => { setHistory(undefined); mirrorDo((m) => m.save({ history: keep })); }}
      onPreview={(packageName, preview) => mirrorDo((m) => m.save({ apps: apps.map((app) => app.packageName === packageName ? { packageName, preview } : app) }))}
      onRemove={(packageName) => mirrorDo((m) => m.save({ apps: apps.filter((app) => app.packageName !== packageName) }))}
      onAdd={(packageName) => mirrorDo((m) => m.save({ apps: [...apps, { packageName, preview: false }] }))}
      onShowChoices={() => answer(Effect.flatMap(Effect.service(Mirror), (m) => m.choices()), setChoices)}
      onShowHistory={() => answer(Effect.flatMap(Effect.service(Mirror), (m) => m.history()), setHistory)}
      onClearHistory={() => answer(Effect.flatMap(Effect.service(Mirror), (m) => Effect.andThen(m.clearHistory(), m.history())), setHistory)}
      onResume={() => mirrorDo((m) => m.resume())}
    />
  );
}
