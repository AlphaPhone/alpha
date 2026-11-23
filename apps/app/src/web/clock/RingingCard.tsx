// spec/clock/ringer.md, "Story: Hear an alarm once, from the page in front"; spec/clock/alarms.md, "Story: Stop a ringing alarm"; spec/clock/timers.md, "Story: Hear a timer end"
import { AlarmClock, BellOff, Timer as TimerIcon, VolumeX } from "lucide-react";
import { canDismissAlarm, canSnoozeAlarm, type Alarm, type AlarmClock as Alarms } from "../../../gen/clock__alarms.ts";
import { canDismissTimer, type Timer, type Timers } from "../../../gen/clock__timers.ts";
import type { Ringer } from "../../../gen/clock__ringer.ts";
import { Button, Card } from "../components/ui/index.ts";
import { wall } from "./text.ts";

/** The ringer and what rings now, and the owner's Silence, Snooze, Dismiss and Stop. */
export type RingingCardProps = {
  /** The page's ringer: whether it holds the lock and sounds. */
  ringer: Ringer;
  /** The ringing alarms of the browser build; none on the phone, where Android Clock rings. */
  alarms: Alarms;
  timers: Timers;
  onSilence: () => void;
  onSnooze: (alarm: Alarm) => void;
  onDismiss: (alarm: Alarm) => void;
  onStopTimer: (timer: Timer) => void;
};

/** A ringing alarm or finished timer, over every screen, until it is snoozed, dismissed or stopped. */
export function RingingCard({ ringer, alarms, timers, onSilence, onSnooze, onDismiss, onStopTimer }: RingingCardProps) {
  const ringingAlarms = alarms.alarms.filter((a) => a.phase === "AlarmRinging");
  const ringingTimers = timers.timers.filter((t) => t.phase === "TimerRinging");
  if (!ringingAlarms.length && !ringingTimers.length) return null;
  return (
    <Card role="alertdialog" aria-label="Ringing" className="pointer-events-auto mx-3 mt-3 gap-3 border-primary">
      {ringingAlarms.map((alarm) => (
        <div key={alarm.id} className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <AlarmClock aria-hidden className="size-6 text-primary" />
            <span className="font-serif text-4xl tabular-nums">{wall(alarm.hour, alarm.minute)}</span>
            <span className="truncate text-sm text-muted-foreground">{alarm.label}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" disabled={!canSnoozeAlarm(alarms, alarm.id, alarm.revision, ringer.now)} onClick={() => onSnooze(alarm)}>Snooze</Button>
            <Button className="flex-1" disabled={!canDismissAlarm(alarms, alarm.id, alarm.revision, alarm.days.length ? ringer.now + 60_000 : 0, ringer.now)} onClick={() => onDismiss(alarm)}>
              <BellOff aria-hidden className="size-4" />Dismiss
            </Button>
          </div>
        </div>
      ))}
      {ringingTimers.map((timer) => (
        <div key={timer.id} className="flex items-center gap-3">
          <TimerIcon aria-hidden className="size-6 text-primary" />
          <span className="flex-1 truncate">{timer.label || "Timer"}</span>
          <Button disabled={!canDismissTimer(timers, timer.id, timer.revision)} onClick={() => onStopTimer(timer)}>Stop</Button>
        </div>
      ))}
      {ringer.sounding && (
        <Button variant="ghost" size="sm" className="self-end" onClick={onSilence}><VolumeX aria-hidden className="size-4" />Silence</Button>
      )}
    </Card>
  );
}
