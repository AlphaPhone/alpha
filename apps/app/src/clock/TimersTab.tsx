// spec/app/clock/timers.md, "Story: Run multiple countdown timers"
import { Button, Card, EmptyState, Input, Label, Progress, Sheet, SheetContent, StatusDot } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Pause, Play, Plus, RotateCcw, Timer as TimerIcon, Trash2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import type { Machine as ClockViewMachine } from "../../gen/app__clock.effect.vibe";
import { useMachine as useClockView } from "../../gen/app__clock.react.ts";
import { useMachine as useTimers } from "../../gen/app__clock__timers.react.ts";
import { clockRecords, TIMER_PRESETS } from "./records.ts";
import type { ClockResident } from "./sync.vibe";
import { clockNow } from "./ticker.vibe";
import { formatTimerDuration } from "./time.ts";
import {
  addTimerMinute,
  createTimer,
  dismissTimer,
  liveRemainingMs,
  pauseTimer,
  removeTimer,
  resetTimer,
  resumeTimer,
  startTimer,
} from "./timers.vibe";

export interface TimersTabProps {
  /** Clock resident machines. */
  runtime: ManagedRuntime.ManagedRuntime<ClockResident | ClockViewMachine, unknown>;
}

function clampField(raw: string, max: number): number {
  const num = Number.parseInt(raw, 10);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(max, num);
}

/** Multi-timer tab with quick presets, custom H/M/S sheet, progress bars, and +1:00 extensions. */
export function TimersTab({ runtime }: TimersTabProps) {
  const timersState = useTimers(runtime).state;
  const view = useClockView(runtime);
  useSyncExternalStore(clockRecords.subscribe, clockRecords.snapshot);
  const now = useSyncExternalStore(clockNow.subscribe, clockNow.snapshot);

  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("5");
  const [seconds, setSeconds] = useState("0");
  const [label, setLabel] = useState("");

  const items = timersState?.items ?? [];
  const customSheetOpen = view.state?.sheet.tag === "NewTimer";

  const customDurationMs = (clampField(hours, 23) * 3600 + clampField(minutes, 59) * 60 + clampField(seconds, 59)) * 1000;

  const startPreset = (durationMs: number, presetLabel: string) => {
    void runtime.runPromise(createTimer(durationMs, presetLabel, true));
  };

  const handleCreateCustom = () => {
    if (customDurationMs <= 0) return;
    void runtime.runPromise(createTimer(customDurationMs, label, true)).then(() => {
      setLabel("");
      void view.send({ type: "closeSheet" });
    });
  };

  return (
    <section aria-label="Timers" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">Quick start</span>
          <Button
            size="sm"
            aria-label="Custom timer"
            disabled={!view.can({ type: "openSheet", sheet: { tag: "NewTimer" } })}
            onClick={() => void view.send({ type: "openSheet", sheet: { tag: "NewTimer" } })}
          >
            <Plus aria-hidden className="size-4" />
            Custom
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {TIMER_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant="secondary"
              size="sm"
              aria-label={`Start ${preset.label} timer`}
              onClick={() => startPreset(preset.durationMs, `${preset.label} timer`)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<TimerIcon aria-hidden />} title="No active timers">
          <Button onClick={() => void view.send({ type: "openSheet", sheet: { tag: "NewTimer" } })}>
            New timer
          </Button>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const record = clockRecords.timer(item.id);
            const title = record.label || `Timer ${item.id}`;
            const remaining = liveRemainingMs(item, now > 0 ? now : item.startedAt);
            const elapsed = Math.max(0, item.durationMs - Math.min(item.durationMs, remaining));
            const statusKind = item.status === "Ringing" ? "error" : item.status === "Running" ? "ok" : item.status === "Paused" ? "warn" : "off";
            return (
              <Card key={item.id} className="gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusDot status={statusKind} label={item.status} />
                    <span className="font-medium text-foreground">{title}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${title}`}
                    onClick={() => void runtime.runPromise(removeTimer(item.id))}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </Button>
                </div>

                <div className="flex items-baseline justify-between gap-3">
                  <span className={`text-4xl font-light tabular-nums ${item.status === "Ringing" ? "text-destructive" : "text-foreground"}`}>
                    {formatTimerDuration(remaining)}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {item.status === "Ringing" ? "Time's up" : item.status}
                  </span>
                </div>

                <Progress value={elapsed} max={item.durationMs} aria-label={`${title} progress`} />

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {item.status === "Ready" && (
                    <Button size="sm" aria-label={`Start ${title}`} onClick={() => void runtime.runPromise(startTimer(item.id))}>
                      <Play aria-hidden className="size-4" />
                      Start
                    </Button>
                  )}
                  {item.status === "Running" && (
                    <Button size="sm" variant="secondary" aria-label={`Pause ${title}`} onClick={() => void runtime.runPromise(pauseTimer(item.id))}>
                      <Pause aria-hidden className="size-4" />
                      Pause
                    </Button>
                  )}
                  {item.status === "Paused" && (
                    <Button size="sm" aria-label={`Resume ${title}`} onClick={() => void runtime.runPromise(resumeTimer(item.id))}>
                      <Play aria-hidden className="size-4" />
                      Resume
                    </Button>
                  )}
                  {item.status === "Ringing" && (
                    <Button size="sm" variant="destructive" aria-label={`Stop ${title}`} onClick={() => void runtime.runPromise(dismissTimer(item.id))}>
                      Stop
                    </Button>
                  )}
                  {item.status !== "Ready" && (
                    <Button size="sm" variant="outline" aria-label={`Add 1 minute to ${title}`} onClick={() => void runtime.runPromise(addTimerMinute(item.id, 60_000))}>
                      +1:00
                    </Button>
                  )}
                  {item.status !== "Ready" && item.status !== "Ringing" && (
                    <Button size="sm" variant="ghost" aria-label={`Reset ${title}`} onClick={() => void runtime.runPromise(resetTimer(item.id))}>
                      <RotateCcw aria-hidden className="size-4" />
                      Reset
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {customSheetOpen && (
        <Sheet open onOpenChange={(opened) => (opened ? undefined : void view.send({ type: "closeSheet" }))}>
          <SheetContent
            title="New timer"
            description="Set a custom hours, minutes, and seconds countdown."
            actions={
              <>
                <Button variant="ghost" onClick={() => void view.send({ type: "closeSheet" })}>Cancel</Button>
                <Button disabled={customDurationMs <= 0} onClick={handleCreateCustom}>Start timer</Button>
              </>
            }
          >
            <div className="flex flex-col gap-4 py-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="timer-hours">Hours</Label>
                  <Input id="timer-hours" aria-label="Timer hours" inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="timer-minutes">Minutes</Label>
                  <Input id="timer-minutes" aria-label="Timer minutes" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="timer-seconds">Seconds</Label>
                  <Input id="timer-seconds" aria-label="Timer seconds" inputMode="numeric" value={seconds} onChange={(e) => setSeconds(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="timer-label">Label</Label>
                <Input
                  id="timer-label"
                  aria-label="Timer label"
                  placeholder="Pasta, laundry, focus sprint..."
                  maxLength={120}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </section>
  );
}
