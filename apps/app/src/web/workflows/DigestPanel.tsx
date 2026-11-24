// spec/workflows/digests.md, "Story: See my digests and the newest brief, read only for my account"; spec/workflows/hostedResults.md, "Turning notifications off or on changes what is posted next, never a notice already decided"; spec/workflows/hostedResults.md, "Background delivery is configured only on Android, by one attempt that a pause retires"; spec/workflows/digests.md, "Story: Change a digest once, even when the answer is lost"; spec/workflows/digests.md, "Story: Read a digest's state plainly"; spec/workflows/hostedResults.md, "A result shown in the panel withdraws its notice, and the panel's scope posts silently"
import type { MissedRunNow } from "@elizaos/plugin-workflow/digests";
import { Newspaper } from "lucide-react";
import { useState } from "react";
import { loopWord, type Digests, type LoopRow, type ResultRow } from "../../../gen/workflows__digests.ts";
import { Alert, Button, Card, CardTitle, EmptyState, ListRow, Switch } from "../components/ui/index.ts";
import { ReviewDialog } from "./ReviewDialog.tsx";
import { digestNotices, digestText, loopWords, occurredWords, when } from "./words.ts";

/** What the digest panel shows and offers. */
export interface DigestPanelProps {
  digests: Digests;
  /** The phone's time zone, for the note when a digest runs in another. */
  deviceZone: string;
  can: { readonly retry: boolean; readonly discard: boolean; readonly change: boolean };
  /** The result opened in full, from the list or from its notice. */
  opened?: string;
  /** The agent's Run now offer under review, once the screen has read it. */
  runNowReview?: MissedRunNow;
  onToggle: (loop: LoopRow, on: boolean) => void;
  onReviewRunNow: (result: ResultRow) => void;
  onRunNow: (offer: MissedRunNow) => void;
  onCloseRunNow: () => void;
  onRetry: () => void;
  onDiscard: () => void;
  onOpenResult: (result: ResultRow) => void;
  /** Whether result notifications are on. */
  notifications: boolean;
  /** Whether background checks are on or being configured; undefined in the browser build, which has none. */
  background?: boolean;
  onNotifications: (on: boolean) => void;
  onBackground: (on: boolean) => void;
}

const notRun = { missed: occurredWords.Missed, overlap: occurredWords.Overlapped, unavailable: occurredWords.SourceUnavailable } as Record<string, string>;

/**
 * Scheduled digests, their results and the newest brief, for the current account only.
 * @model spec/workflows/digests.md
 * @design design.md
 */
export function DigestPanel({
  digests, deviceZone, can, opened, runNowReview, onToggle, onReviewRunNow, onRunNow, onCloseRunNow, onRetry, onDiscard, onOpenResult,
  notifications, background, onNotifications, onBackground,
}: DigestPanelProps) {
  const [toggle, setToggle] = useState<{ loop: LoopRow; on: boolean } | undefined>(undefined);
  const notice = digestNotices[digests.notice];
  return (
    <section aria-label="Scheduled digests" className="flex flex-col gap-3">
      {digests.brief !== "" && (
        <Card className="mx-4 flex flex-col gap-2 p-4">
          <CardTitle className="flex items-center gap-2"><Newspaper aria-hidden className="size-5 text-primary" />Brief</CardTitle>
          <p className="whitespace-pre-wrap font-legible">{digests.brief}</p>
        </Card>
      )}
      {notice && <Alert role="status" variant="warn" className="mx-4 text-sm">{notice}</Alert>}
      {digests.pending !== "NoPending" && !digests.busy && (
        <Alert className="mx-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="flex-1">A digest change is saved on this phone.</span>
          <Button size="sm" disabled={!can.retry} onClick={onRetry}>Retry</Button>
          {digests.pending === "InReview" && <Button size="sm" variant="ghost" disabled={!can.discard} onClick={onDiscard}>Discard</Button>}
        </Alert>
      )}
      {digests.loops.length === 0 && digests.available && <EmptyState title="No scheduled digests" icon={<Newspaper aria-hidden />} />}
      <ul aria-label="Digests" className="flex flex-col">
        {digests.loops.filter((l) => !l.removed).map((loop) => {
          const word = loopWords[loopWord(loop.removed, loop.enabled, loop.active, loop.sourceRevoked, loop.sourceExpired)];
          const zone = loop.zone !== deviceZone && loop.enabled ? ` · ${loop.zone}` : "";
          return (
            <li key={loop.id} className="flex items-center gap-2 pr-4">
              <ListRow className="flex-1" title={loop.name} detail={`${loop.localTime}${zone} · ${word}`} aria-label={`${loop.name}, ${loop.localTime}, ${word}`} />
              <Switch aria-label={loop.enabled ? `Pause ${loop.name}` : `Resume ${loop.name}`} checked={loop.enabled} disabled={!can.change}
                className="min-h-12 min-w-12" onCheckedChange={(on) => setToggle({ loop, on })} />
            </li>
          );
        })}
      </ul>
      <ul aria-label="Digest delivery" className="flex flex-col">
        <li className="flex items-center gap-2 pr-4">
          <ListRow className="flex-1" title="Notifications" detail={notifications ? "A finished digest posts a notice." : "Finished digests post no notice."} />
          <Switch aria-label="Notifications" checked={notifications} className="min-h-12 min-w-12" onCheckedChange={onNotifications} />
        </li>
        {background !== undefined && (
          <li className="flex items-center gap-2 pr-4">
            <ListRow className="flex-1" title="Background checks" detail={background ? "Your phone fetches results while Alpha is closed." : "Results arrive when you open Alpha."} />
            <Switch aria-label="Background checks" checked={background} className="min-h-12 min-w-12" onCheckedChange={onBackground} />
          </li>
        )}
      </ul>
      <ol aria-label="Digest results" className="flex flex-col">
        {digests.results.map((result) => (
          <li key={result.runId} className="flex flex-col">
            <ListRow title={when(Date.parse(result.completedAt || result.scheduledAt))} aria-expanded={opened === result.runId}
              detail={notRun[result.status] ?? digestText(result.error, result.text).slice(0, 120)} onClick={() => onOpenResult(result)} />
            {opened === result.runId && notRun[result.status] === undefined && (
              <p className="mx-4 mb-2 whitespace-pre-wrap font-legible">{digestText(result.error, result.text)}</p>
            )}
            {result.runNow && <Button size="lg" variant="outline" className="mx-4 mb-2" disabled={!can.change} onClick={() => onReviewRunNow(result)}>Run now</Button>}
          </li>
        ))}
      </ol>
      <ReviewDialog open={toggle !== undefined} onCancel={() => setToggle(undefined)}
        title={toggle === undefined ? "" : toggle.on ? `Resume ${toggle.loop.name}?` : `Pause ${toggle.loop.name}?`} confirm="Confirm"
        onConfirm={() => {
          const chosen = toggle;
          setToggle(undefined);
          if (chosen !== undefined) onToggle(chosen.loop, chosen.on);
        }}>
        <p>The time, zone and source stay as you saved them.</p>
      </ReviewDialog>
      <ReviewDialog open={runNowReview !== undefined} onCancel={onCloseRunNow} confirm="Run now" disabled={!can.change}
        title={runNowReview === undefined ? "" : `Run the ${when(Date.parse(runNowReview.scheduledAt))} digest now?`}
        onConfirm={() => { if (runNowReview !== undefined) onRunNow(runNowReview); }}>
        <p>This reads {runNowReview?.sourceLabel ?? "your reviewed source"} as it is now, once, and sends it to your agent’s AI. The missed record stays.</p>
      </ReviewDialog>
    </section>
  );
}
