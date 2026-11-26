// spec/app/clock/timers.md, "Story: Run multiple countdown timers"
import { Button, Card, EmptyState, Input, Label, Progress, Sheet, SheetContent, StatusDot } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Clock, Pause, Play, Plus, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";
import type { Machine as ClockViewMachine } from "../../gen/app__clock.effect.vibe";
import { useMachine as useClockView } from "../../gen/app__clock.react.ts";
import { useMachine as useTimers } from "../../gen/app__clock__timers.react.ts";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { TIMER_PRESETS, timerMetaOf } from "./records.ts";
import type { ClockResident } from "./sync.vibe";
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
import { useClockMeta, useClockNow } from "./useClockStore.ts";

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
  const timers = useTimed(runtime, useTimers);
  const timersState = timers.state;
  const view = useClockView(runtime);
  const meta = useClockMeta(runtime);
  const now = useClockNow(runtime);

  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("5");
  const [seconds, setSeconds] = useState("0");
  const [label, setLabel] = useState("");

  const items = timersState?.items ?? [];
  const customSheetOpen = view.state?.sheet.tag === "NewTimer";
  const canOpenCustom = view.can({ type: "openSheet", sheet: { tag: "NewTimer" } });
  const canCloseSheet = view.can({ type: "closeSheet" });

  const customDurationMs = (clampField(hours, 23) * 3600 + clampField(minutes, 59) * 60 + clampField(seconds, 59)) * 1000;
  const canCreateCustom = customDurationMs > 0 && timers.can({ type: "create", durationMs: customDurationMs, autoStart: true, at: untimed });

  const openCustomSheet = () => {
    if (canOpenCustom) void view.send({ type: "openSheet", sheet: { tag: "NewTimer" } });
  };

  const closeCustomSheet = () => {
    if (canCloseSheet) void view.send({ type: "closeSheet" });
  };

  const startPreset = (durationMs: number, presetLabel: string) => {
    if (!timers.can({ type: "create", durationMs, autoStart: true, at: untimed })) return;
    void runtime.runPromise(createTimer(durationMs, presetLabel, true));
  };

  const handleCreateCustom = () => {
    if (!canCreateCustom) return;
    void runtime.runPromise(createTimer(customDurationMs, label, true)).then((createdId) => {
      if (createdId > 0) {
        setLabel("");
        if (view.can({ type: "closeSheet" })) void view.send({ type: "closeSheet" });
      }
    });
  };

  return (
    <section aria-label="Timers" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">Quick start</span>
          <Button
            size="sm"
            className="min-h-11"
            aria-label="Custom timer"
            disabled={!canOpenCustom}
            onClick={openCustomSheet}
          >
            <Plus aria-hidden className="size-4.5" />
            Custom
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {TIMER_PRESETS.map((preset) => {
            const canCreatePreset = timers.can({ type: "create", durationMs: preset.durationMs, autoStart: true, at: untimed });
            return (
              <Button
                key={preset.label}
                variant="secondary"
                size="sm"
                className="min-h-11"
                aria-label={`Start ${preset.label} timer`}
                disabled={!canCreatePreset}
                onClick={() => startPreset(preset.durationMs, `${preset.label} timer`)}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<Clock aria-hidden />} title="No active timers">
          <Button disabled={!canOpenCustom} onClick={openCustomSheet}>
            New timer
          </Button>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const record = timerMetaOf(meta, item.id);
            const title = record.label || `Timer ${item.id}`;
            const remaining = liveRemainingMs(item, now > 0 ? now : item.startedAt);
            const effectiveMax = Math.max(item.durationMs, remaining);
            const elapsed = Math.max(0, effectiveMax - remaining);
            const statusKind = item.status === "Ringing" ? "error" : item.status === "Running" ? "ok" : item.status === "Paused" ? "warn" : "off";
            const canRemove = timers.can({ type: "remove", id: item.id });
            const canStart = timers.can({ type: "start", id: item.id, at: untimed });
            const canPause = timers.can({ type: "pause", id: item.id, now: untimed });
            const canResume = timers.can({ type: "resume", id: item.id, at: untimed });
            const canDismiss = timers.can({ type: "dismiss", id: item.id });
            const canAdd = timers.can({ type: "addTime", id: item.id, deltaMs: 60_000, at: untimed });
            const canReset = timers.can({ type: "reset", id: item.id });
            return (
              <Card key={item.id} className="gap-3 rounded-tile border-0 bg-secondary">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusDot status={statusKind} label={item.status} />
                    <span className="font-medium text-foreground">{title}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${title}`}
                    disabled={!canRemove}
                    onClick={() => void runtime.runPromise(removeTimer(item.id))}
                  >
                    <Trash2 aria-hidden className="size-4.5" />
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

                <Progress value={elapsed} max={effectiveMax} aria-label={`${title} progress`} />

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {item.status === "Ready" && (
                    <Button size="sm" className="min-h-11" aria-label={`Start ${title}`} disabled={!canStart} onClick={() => void runtime.runPromise(startTimer(item.id))}>
                      <Play aria-hidden className="size-4.5" />
                      Start
                    </Button>
                  )}
                  {item.status === "Running" && (
                    <Button size="sm" variant="secondary" className="min-h-11 bg-background" aria-label={`Pause ${title}`} disabled={!canPause} onClick={() => void runtime.runPromise(pauseTimer(item.id))}>
                      <Pause aria-hidden className="size-4.5" />
                      Pause
                    </Button>
                  )}
                  {item.status === "Paused" && (
                    <Button size="sm" className="min-h-11" aria-label={`Resume ${title}`} disabled={!canResume} onClick={() => void runtime.runPromise(resumeTimer(item.id))}>
                      <Play aria-hidden className="size-4.5" />
                      Resume
                    </Button>
                  )}
                  {item.status === "Ringing" && (
                    <Button size="sm" variant="destructive" className="min-h-11" aria-label={`Stop ${title}`} disabled={!canDismiss} onClick={() => void runtime.runPromise(dismissTimer(item.id))}>
                      Stop
                    </Button>
                  )}
                  {item.status !== "Ready" && (
                    <Button size="sm" variant="outline" className="min-h-11" aria-label={`Add 1 minute to ${title}`} disabled={!canAdd} onClick={() => void runtime.runPromise(addTimerMinute(item.id, 60_000))}>
                      +1:00
                    </Button>
                  )}
                  {item.status !== "Ready" && item.status !== "Ringing" && (
                    <Button size="sm" variant="ghost" className="min-h-11" aria-label={`Reset ${title}`} disabled={!canReset} onClick={() => void runtime.runPromise(resetTimer(item.id))}>
                      <Undo2 aria-hidden className="size-4.5" />
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
        <Sheet open onOpenChange={(opened) => (opened ? undefined : closeCustomSheet())}>
          <SheetContent
            title="New timer"
            description="Set a custom hours, minutes, and seconds countdown."
            actions={
              <>
                <Button variant="ghost" disabled={!canCloseSheet} onClick={closeCustomSheet}>Cancel</Button>
                <Button disabled={!canCreateCustom} onClick={handleCreateCustom}>Start timer</Button>
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
