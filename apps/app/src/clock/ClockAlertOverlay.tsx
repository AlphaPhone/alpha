// spec/app/clock/index.md, "Story: Hear and prioritize ringing alerts"; spec/app/clock/alarms.md, "Story: Ring, snooze, dismiss, and recover alarms"; spec/app/clock/timers.md, "Story: Run multiple countdown timers"
import { Button, Card } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { AlarmClock, BellOff, Timer as TimerIcon, VolumeX } from "lucide-react";
import { useSyncExternalStore } from "react";
import type { Machine as ClockViewMachine } from "../../gen/app__clock.effect.vibe";
import { useMachine as useClockView } from "../../gen/app__clock.react.ts";
import { activeAlert } from "../../gen/app__clock.ts";
import { useMachine as useAlarms } from "../../gen/app__clock__alarms.react.ts";
import { useMachine as useTimers } from "../../gen/app__clock__timers.react.ts";
import { dismissAlarm, snoozeAlarm } from "./alarms.vibe";
import { clockRecords } from "./records.ts";
import type { ClockResident } from "./sync.vibe";
import { formatAlarmTime } from "./time.ts";
import { addTimerMinute, dismissTimer } from "./timers.vibe";

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
  const alarmsState = useAlarms(runtime).state;
  const timersState = useTimers(runtime).state;
  const meta = useSyncExternalStore(clockRecords.subscribe, clockRecords.snapshot);

  if (!view.state) return null;
  const active = activeAlert(view.state);
  if (active.tag === "NoAlert") return null;

  const canMute = view.can({ type: "muteAlert" });

  if (active.tag === "AlarmRing") {
    const alarm = alarmsState?.items.find((item) => item.id === active.id);
    if (!alarm) return null;
    const record = clockRecords.alarm(alarm.id);
    const display = formatAlarmTime(alarm.hour, alarm.minute, meta.hour24);
    const timeText = `${display.time}${display.period ? ` ${display.period}` : ""}`;
    return (
      <div role="alertdialog" aria-label="Ringing alarm" className="fixed inset-x-0 top-0 z-50 mx-auto max-w-md p-3">
        <Card className="border-destructive bg-card shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                <AlarmClock className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-semibold tabular-nums text-foreground">{timeText}</p>
                <p className="truncate text-sm text-muted-foreground">{record.label || "Alarm ringing"}</p>
              </div>
            </div>
            {canMute && (
              <Button variant="ghost" size="icon" aria-label="Mute alarm sound" onClick={() => void view.send({ type: "muteAlert" })}>
                <VolumeX aria-hidden className="size-4" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => void runtime.runPromise(snoozeAlarm(alarm.id))}>
              {`Snooze ${alarm.snoozeMinutes}m`}
            </Button>
            <Button variant="destructive" onClick={() => void runtime.runPromise(dismissAlarm(alarm.id))}>
              <BellOff aria-hidden className="size-4" />
              Dismiss
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const timer = timersState?.items.find((item) => item.id === active.id);
  if (!timer) return null;
  const record = clockRecords.timer(timer.id);
  const title = record.label || `Timer ${timer.id}`;

  return (
    <div role="alertdialog" aria-label="Ringing timer" className="fixed inset-x-0 top-0 z-50 mx-auto max-w-md p-3">
      <Card className="border-primary bg-card shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <TimerIcon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold text-foreground">{title}</p>
              <p className="text-sm text-muted-foreground">Time&apos;s up</p>
            </div>
          </div>
          {canMute && (
            <Button variant="ghost" size="icon" aria-label="Mute timer sound" onClick={() => void view.send({ type: "muteAlert" })}>
              <VolumeX aria-hidden className="size-4" />
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => void runtime.runPromise(addTimerMinute(timer.id, 60_000))}>
            +1:00
          </Button>
          <Button variant="destructive" onClick={() => void runtime.runPromise(dismissTimer(timer.id))}>
            Stop
          </Button>
        </div>
      </Card>
    </div>
  );
}
