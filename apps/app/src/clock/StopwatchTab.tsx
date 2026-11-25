// spec/app/clock/stopwatch.md, "Story: Time laps with the stopwatch"
import { Button, Card } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Flag, Pause, Play, RotateCcw } from "lucide-react";
import { useSyncExternalStore } from "react";
import type { Machine as StopwatchMachine } from "../../gen/app__clock__stopwatch.effect.vibe";
import { useMachine as useStopwatch } from "../../gen/app__clock__stopwatch.react.ts";
import { bestLapIndex, elapsedAt, lastLapTotal, worstLapIndex } from "../../gen/app__clock__stopwatch.ts";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import type { Time } from "../runtime/time.vibe";
import { stopwatchNow } from "./ticker.vibe";
import { formatStopwatch } from "./time.ts";

export interface StopwatchTabProps {
  /** Stopwatch machine and Alpha Time service. */
  runtime: ManagedRuntime.ManagedRuntime<StopwatchMachine | Time, unknown>;
}

/** Precision stopwatch with centisecond display, lap splits, and fastest/slowest highlights. */
export function StopwatchTab({ runtime }: StopwatchTabProps) {
  const sw = useTimed(runtime, useStopwatch);
  const tickNow = useSyncExternalStore(stopwatchNow.subscribe, stopwatchNow.snapshot);
  const state = sw.state;
  if (!state) return null;

  const anchorNow = tickNow > 0 ? tickNow : state.startedAt;
  const totalElapsed = elapsedAt(state, anchorNow);
  const currentSplit = Math.max(0, totalElapsed - lastLapTotal(state.laps));
  const bestIdx = bestLapIndex(state.laps);
  const worstIdx = worstLapIndex(state.laps);
  const reversedLaps = [...state.laps].reverse();

  const startEvent = { type: "start", now: untimed } as const;
  const pauseEvent = { type: "pause", now: untimed } as const;
  const resumeEvent = { type: "resume", now: untimed } as const;
  const lapEvent = { type: "lap", now: untimed } as const;
  const resetEvent = { type: "reset" } as const;

  return (
    <section aria-label="Stopwatch" className="flex flex-col gap-5">
      <Card className="items-center gap-2 py-8">
        <span aria-label="Stopwatch elapsed time" className="font-mono text-4xl font-light tracking-tight tabular-nums text-foreground">
          {formatStopwatch(totalElapsed)}
        </span>
        {state.laps.length > 0 && (
          <span className="font-mono text-sm tabular-nums text-muted-foreground">
            {`Lap ${state.laps.length + 1} · ${formatStopwatch(currentSplit)}`}
          </span>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {state.status === "Paused" ? (
          <Button variant="secondary" disabled={!sw.can(resetEvent)} onClick={() => void sw.send(resetEvent)}>
            <RotateCcw aria-hidden className="size-4" />
            Reset
          </Button>
        ) : (
          <Button variant="secondary" disabled={!sw.can(lapEvent)} onClick={() => void sw.send(lapEvent)}>
            <Flag aria-hidden className="size-4" />
            Lap
          </Button>
        )}

        {state.status === "Reset" && (
          <Button disabled={!sw.can(startEvent)} onClick={() => void sw.send(startEvent)}>
            <Play aria-hidden className="size-4" />
            Start
          </Button>
        )}
        {state.status === "Running" && (
          <Button variant="destructive" disabled={!sw.can(pauseEvent)} onClick={() => void sw.send(pauseEvent)}>
            <Pause aria-hidden className="size-4" />
            Pause
          </Button>
        )}
        {state.status === "Paused" && (
          <Button disabled={!sw.can(resumeEvent)} onClick={() => void sw.send(resumeEvent)}>
            <Play aria-hidden className="size-4" />
            Resume
          </Button>
        )}
      </div>

      {reversedLaps.length > 0 && (
        <Card className="gap-2 p-0">
          <div className="grid grid-cols-3 border-b border-border px-4 py-2 text-xs font-semibold text-muted-foreground">
            <span>Lap</span>
            <span className="text-right">Split</span>
            <span className="text-right">Total</span>
          </div>
          <ul className="divide-y divide-border" aria-label="Recorded laps">
            {reversedLaps.map((entry) => {
              const idx = entry.number - 1;
              const isBest = idx === bestIdx;
              const isWorst = idx === worstIdx;
              const toneClass = isBest ? "text-ok font-semibold" : isWorst ? "text-destructive font-semibold" : "text-foreground";
              return (
                <li key={entry.number} className="grid grid-cols-3 items-center px-4 py-2.5 text-sm">
                  <span className={toneClass}>
                    {`Lap ${entry.number}${isBest ? " · Fastest" : isWorst ? " · Slowest" : ""}`}
                  </span>
                  <span className={`text-right font-mono tabular-nums ${toneClass}`}>{formatStopwatch(entry.splitMs)}</span>
                  <span className="text-right font-mono tabular-nums text-muted-foreground">{formatStopwatch(entry.totalMs)}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </section>
  );
}
