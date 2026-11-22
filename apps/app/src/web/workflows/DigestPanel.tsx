// spec/workflows/digests.md, "Story: See my digests and the newest brief, read only for my account"; spec/workflows/digests.md, "Story: Change a digest once, even when the answer is lost"; spec/workflows/digests.md, "Story: Read a digest's state plainly"
import { Newspaper } from "lucide-react";
import { useState } from "react";
import { loopWord, type Digests, type LoopRow, type ResultRow } from "../../../gen/workflows__digests.ts";
import { Alert, Button, Card, CardTitle, EmptyState, ListRow, Switch } from "../components/ui/index.ts";
import { ReviewDialog } from "./ReviewDialog.tsx";
import { digestNotices, digestText, loopWords, occurredWords, when } from "./words.ts";

export interface DigestPanelProps {
  digests: Digests;
  /** The phone's time zone, for the note when a digest runs in another. */
  deviceZone: string;
  can: { readonly retry: boolean; readonly discard: boolean; readonly change: boolean };
  onToggle: (loop: LoopRow, on: boolean) => void;
  onRemove: (loop: LoopRow) => void;
  onRunNow: (result: ResultRow) => void;
  onRetry: () => void;
  onDiscard: () => void;
  onOpenResult: (result: ResultRow) => void;
}

const notRun = { missed: occurredWords.Missed, overlap: occurredWords.Overlapped, unavailable: occurredWords.SourceUnavailable } as Record<string, string>;

/**
 * Scheduled digests, their results and the newest brief, for the current account only.
 * @model spec/workflows/digests.md
 * @design design.md
 */
export function DigestPanel({ digests, deviceZone, can, onToggle, onRemove, onRunNow, onRetry, onDiscard, onOpenResult }: DigestPanelProps) {
  const [review, setReview] = useState<{ kind: "toggle"; loop: LoopRow; on: boolean } | { kind: "remove"; loop: LoopRow } | { kind: "run"; result: ResultRow } | undefined>(undefined);
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
      <ul className="flex flex-col">
        {digests.loops.filter((l) => !l.removed).map((loop) => {
          const word = loopWords[loopWord(loop.removed, loop.enabled, loop.active, loop.sourceRevoked, loop.sourceExpired)];
          const zone = loop.zone !== deviceZone && loop.enabled ? ` · ${loop.zone}` : "";
          return (
            <li key={loop.id} className="flex items-center gap-2 pr-4">
              <ListRow className="flex-1" title={loop.name} detail={`${loop.localTime}${zone} · ${word}`} aria-label={`${loop.name}, ${loop.localTime}, ${word}`}
                onClick={() => setReview({ kind: "remove", loop })} />
              <Switch aria-label={loop.enabled ? `Pause ${loop.name}` : `Resume ${loop.name}`} checked={loop.enabled} disabled={!can.change}
                className="min-h-12 min-w-12" onCheckedChange={(on) => setReview({ kind: "toggle", loop, on })} />
            </li>
          );
        })}
      </ul>
      <ol aria-label="Digest results" className="flex flex-col">
        {digests.results.map((result) => (
          <li key={result.runId} className="flex flex-col">
            <ListRow title={when(Date.parse(result.completedAt || result.scheduledAt))}
              detail={notRun[result.status] ?? digestText(result.error, result.text).slice(0, 120)} onClick={() => onOpenResult(result)} />
            {result.runNow && <Button size="lg" variant="outline" className="mx-4 mb-2" disabled={!can.change} onClick={() => setReview({ kind: "run", result })}>Run now</Button>}
          </li>
        ))}
      </ol>
      <ReviewDialog open={review !== undefined} onCancel={() => setReview(undefined)} destructive={review?.kind === "remove"}
        title={review?.kind === "toggle" ? (review.on ? `Resume ${review.loop.name}?` : `Pause ${review.loop.name}?`) : review?.kind === "remove" ? `Remove ${review.loop.name}?` : "Run this digest now?"}
        confirm={review?.kind === "remove" ? "Remove" : "Confirm"}
        onConfirm={() => {
          const chosen = review;
          setReview(undefined);
          if (chosen?.kind === "toggle") onToggle(chosen.loop, chosen.on);
          else if (chosen?.kind === "remove") onRemove(chosen.loop);
          else if (chosen?.kind === "run") onRunNow(chosen.result);
        }}>
        {review?.kind === "toggle" && <p>The time, zone and source stay as you saved them.</p>}
        {review?.kind === "run" && <p>This reads your reviewed sources as they are now, once. The missed record stays.</p>}
      </ReviewDialog>
    </section>
  );
}
