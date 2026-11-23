// spec/clock/timers.md, "Story: Time something"; spec/clock/timers.md, "Story: Hear a timer end"
import { useState } from "react";
import { Pause, Play, Plus, RotateCcw, Timer as TimerIcon, X } from "lucide-react";
import { canAddMinute, canDismissTimer, canPauseTimer, canRemoveTimer, canResetTimer, canResumeTimer, canStartTimer, leftAt, type Timer, type Timers } from "../../../gen/clock__timers.ts";
import { Button, EmptyState, Input, Label, Progress } from "../components/ui/index.ts";
import { cn } from "../lib/cn.ts";
import { duration } from "./text.ts";

/** Every timer and the page's instant, and the owner's start, change and stop of a timer. */
export type TimersPanelProps = {
  /** Every timer and its phase. */
  timers: Timers;
  /** The page's latest instant. */
  now: number;
  onStart: (label: string, durationMs: number) => void;
  onTimer: (action: "pause" | "resume" | "addMinute" | "reset" | "remove", timer: Timer) => void;
  onDismiss: (timer: Timer) => void;
};

/**
 * Countdowns that ring when they reach zero.
 * @model spec/clock/timers.md
 */
export function TimersPanel({ timers, now, onStart, onTimer, onDismiss }: TimersPanelProps) {
  const [minutes, setMinutes] = useState("5");
  const [seconds, setSeconds] = useState("0");
  const [label, setLabel] = useState("");
  const ms = (Number(minutes) * 60 + Number(seconds)) * 1000;
  const startable = Number.isFinite(ms) && canStartTimer(timers, "new", ms, now);
  return (
    <section className="flex flex-col gap-6">
      {timers.timers.length === 0 ? <EmptyState title="No timers" icon={<TimerIcon className="size-8" />} /> : (
        <ul className="flex flex-col gap-4">
          {timers.timers.map((timer) => {
            const left = leftAt(timer, now);
            const ringing = timer.phase === "TimerRinging";
            return (
              <li key={timer.id} className={cn("flex flex-col gap-2 rounded-lg border border-border p-4", ringing && "border-primary")}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className={cn("font-serif text-4xl tabular-nums", ringing && "text-primary")}>{duration(left)}</span>
                  <span className="truncate text-sm text-muted-foreground">{timer.label}</span>
                </div>
                <Progress value={timer.durationMs - left} max={timer.durationMs} aria-label={`${timer.label || "Timer"} elapsed`} />
                <div className="flex gap-2">
                  {ringing ? (
                    <Button className="flex-1" disabled={!canDismissTimer(timers, timer.id, timer.revision)} onClick={() => onDismiss(timer)}>Stop</Button>
                  ) : timer.phase === "TimerRunning" ? (
                    <Button variant="secondary" size="icon" aria-label="Pause" disabled={!canPauseTimer(timers, timer.id, now)} onClick={() => onTimer("pause", timer)}><Pause aria-hidden className="size-4" /></Button>
                  ) : (
                    <Button variant="secondary" size="icon" aria-label="Start" disabled={!canResumeTimer(timers, timer.id, now)} onClick={() => onTimer("resume", timer)}><Play aria-hidden className="size-4" /></Button>
                  )}
                  <Button variant="outline" disabled={!canAddMinute(timers, timer.id, now)} onClick={() => onTimer("addMinute", timer)}>+1:00</Button>
                  <Button variant="ghost" size="icon" aria-label="Reset" disabled={!canResetTimer(timers, timer.id)} onClick={() => onTimer("reset", timer)}><RotateCcw aria-hidden className="size-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label="Remove" disabled={!canRemoveTimer(timers, timer.id)} onClick={() => onTimer("remove", timer)}><X aria-hidden className="size-4" /></Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <form className="flex flex-col gap-3" onSubmit={(event) => { event.preventDefault(); if (startable) { onStart(label, ms); setLabel(""); } }}>
        <div className="flex gap-3">
          <div className="flex w-20 flex-col gap-1">
            <Label htmlFor="timer-minutes">Min</Label>
            <Input id="timer-minutes" type="number" min={0} max={1440} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </div>
          <div className="flex w-20 flex-col gap-1">
            <Label htmlFor="timer-seconds">Sec</Label>
            <Input id="timer-seconds" type="number" min={0} max={59} value={seconds} onChange={(e) => setSeconds(e.target.value)} />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="timer-label">Label</Label>
            <Input id="timer-label" maxLength={200} value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
        </div>
        <Button type="submit" disabled={!startable}><Plus aria-hidden className="size-4" />Start</Button>
      </form>
    </section>
  );
}
