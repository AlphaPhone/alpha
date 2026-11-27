// spec/app/clock/index.md, "Story: Hear and prioritize ringing alerts"; spec/app/clock/alarms.md, "Story: Ring, snooze, dismiss, and recover alarms"; spec/app/clock/timers.md, "Story: Run multiple countdown timers"
import { Button, Card } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Clock, VolumeX } from "lucide-react";
import type { Machine as ClockViewMachine } from "../../gen/app__clock.effect.vibe";
import { useMachine as useClockView } from "../../gen/app__clock.react.ts";
import { activeAlert } from "../../gen/app__clock.ts";
import { useMachine as useAlarms } from "../../gen/app__clock__alarms.react.ts";
import { useMachine as useTimers } from "../../gen/app__clock__timers.react.ts";
import { useTimed } from "../runtime/ui.tsx";
import { untimed } from "../runtime/index.vibe";
import { dismissAlarm, snoozeAlarm } from "./alarms.vibe";
import { alarmMetaOf, timerMetaOf } from "./records.ts";
import type { ClockResident } from "./sync.vibe";
import { formatAlarmTime } from "./time.ts";
import { addTimerMinute, dismissTimer } from "./timers.vibe";
import { useClockMeta, useClockNow } from "./useClockStore.ts";

export interface ClockAlertOverlayProps {
  /** Provides Clock's resident machines. */
  runtime: ManagedRuntime.ManagedRuntime<ClockResident | ClockViewMachine, unknown>;
}

/**
 * High-priority ringing alert overlay drawn above every view when an alarm or timer is ringing.
 * @model spec/app/clock/index.md
 */
export function ClockAlertOverlay({ runtime }: ClockAlertOverlayProps) {
  const view = useClockView(runtime);
  const alarms = useTimed(runtime, useAlarms);
  const timers = useTimed(runtime, useTimers);
  const meta = useClockMeta(runtime);
  const now = useClockNow(runtime);

  if (!view.state) return null;
  const active = activeAlert(view.state);
  if (active.tag === "NoAlert") return null;

  const canMute = view.can({ type: "muteAlert" });

  if (active.tag === "AlarmRing") {
    const alarm = alarms.state?.items.find((item) => item.id === active.id);
    if (!alarm) return null;
    const record = alarmMetaOf(meta, alarm.id);
    const display = formatAlarmTime(alarm.hour, alarm.minute, meta.hour24);
    const timeText = `${display.time}${display.period ? ` ${display.period}` : ""}`;
    const canSnooze = alarms.can({ type: "snooze", id: alarm.id, now: untimed });
    const nextDismissFire = alarm.daysMask > 0 ? Math.max(now, alarm.fireAt, alarm.snoozeUntil, 1) + 31_536_000_000 : 0;
    const canDismiss = alarms.can({ type: "dismiss", id: alarm.id, nextFireAt: nextDismissFire, now: untimed });
    return (
      <div role="alertdialog" aria-label="Ringing alarm" className="fixed inset-x-0 top-[var(--alpha-safe-top)] z-alert mx-auto max-w-md p-3">
        <Card className="border-destructive bg-card shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                <Clock className="size-5.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-semibold tabular-nums text-foreground">{timeText}</p>
                <p className="truncate text-sm text-muted-foreground">{record.label || "Alarm ringing"}</p>
              </div>
            </div>
            {canMute && (
              <Button variant="ghost" size="icon" aria-label="Mute alarm sound" disabled={!canMute} onClick={() => void view.send({ type: "muteAlert" })}>
                <VolumeX aria-hidden className="size-4.5" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" disabled={!canSnooze} onClick={() => void runtime.runPromise(snoozeAlarm(alarm.id))}>
              {`Snooze ${alarm.snoozeMinutes}m`}
            </Button>
            <Button variant="destructive" disabled={!canDismiss} onClick={() => void runtime.runPromise(dismissAlarm(alarm.id))}>
              Dismiss
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const timer = timers.state?.items.find((item) => item.id === active.id);
  if (!timer) return null;
  const record = timerMetaOf(meta, timer.id);
  const title = record.label || `Timer ${timer.id}`;
  const canAdd = timers.can({ type: "addTime", id: timer.id, deltaMs: 60_000, at: untimed });
  const canDismiss = timers.can({ type: "dismiss", id: timer.id });

  return (
    <div role="alertdialog" aria-label="Ringing timer" className="fixed inset-x-0 top-[var(--alpha-safe-top)] z-alert mx-auto max-w-md p-3">
      <Card className="border-primary bg-card shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Clock className="size-5.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold text-foreground">{title}</p>
              <p className="text-sm text-muted-foreground">Time&apos;s up</p>
            </div>
          </div>
          {canMute && (
            <Button variant="ghost" size="icon" aria-label="Mute timer sound" disabled={!canMute} onClick={() => void view.send({ type: "muteAlert" })}>
              <VolumeX aria-hidden className="size-4.5" />
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" disabled={!canAdd} onClick={() => void runtime.runPromise(addTimerMinute(timer.id, 60_000))}>
            +1:00
          </Button>
          <Button variant="destructive" disabled={!canDismiss} onClick={() => void runtime.runPromise(dismissTimer(timer.id))}>
            Stop
          </Button>
        </div>
      </Card>
    </div>
  );
}
