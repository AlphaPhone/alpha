// spec/clock/stopwatch.md, "Story: Measure elapsed time"
import { Flag, Pause, Play, RotateCcw } from "lucide-react";
import { canLap, canResetStopwatch, canStartStopwatch, canStopStopwatch, elapsed, type Stopwatch } from "../../../gen/clock__stopwatch.ts";
import { Button } from "../components/ui/index.ts";
import { duration } from "./text.ts";

/** The stopwatch as kept, the page's instant, and Start, Stop, Lap and Reset. */
export type StopwatchPanelProps = {
  /** The stopwatch as kept. */
  watch: Stopwatch;
  /** The page's latest instant. */
  now: number;
  onAction: (action: "start" | "stop" | "lap" | "reset") => void;
};

/**
 * Elapsed time and laps.
 * @model spec/clock/stopwatch.md
 */
export function StopwatchPanel({ watch, now, onAction }: StopwatchPanelProps) {
  const at = Math.max(now, watch.seen);
  return (
    <section className="flex flex-col items-center gap-8">
      <output aria-live="off" className="font-display text-6xl tabular-nums">{duration(elapsed(watch, at), true)}</output>
      <div className="flex gap-4">
        {watch.running ? (
          <>
            <Button variant="secondary" size="lg" aria-label="Lap" disabled={!canLap(watch, at)} onClick={() => onAction("lap")}><Flag aria-hidden className="size-5" /></Button>
            <Button size="lg" aria-label="Stop" disabled={!canStopStopwatch(watch, at)} onClick={() => onAction("stop")}><Pause aria-hidden className="size-5" /></Button>
          </>
        ) : (
          <>
            <Button variant="secondary" size="lg" aria-label="Reset" disabled={!canResetStopwatch(watch)} onClick={() => onAction("reset")}><RotateCcw aria-hidden className="size-5" /></Button>
            <Button size="lg" aria-label="Start" disabled={!canStartStopwatch(watch, at)} onClick={() => onAction("start")}><Play aria-hidden className="size-5" /></Button>
          </>
        )}
      </div>
      {watch.laps.length > 0 && (
        <ol className="flex w-full flex-col divide-y divide-border">
          {[...watch.laps].reverse().map((lap, i, all) => {
            const index = all.length - i;
            const previous = watch.laps[index - 2] ?? 0;
            return (
              <li key={index} className="flex justify-between py-2 font-mono text-sm tabular-nums">
                <span className="text-muted-foreground">{index}</span>
                <span>{duration(lap - previous, true)}</span>
                <span className="text-muted-foreground">{duration(lap, true)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
