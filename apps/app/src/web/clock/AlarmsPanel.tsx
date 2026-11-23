// spec/clock/alarms.md, "Story: Set an alarm in the browser build"; spec/clock/alarms.md, "Story: Stop a ringing alarm"
import { useState } from "react";
import { AlarmClock as AlarmIcon, BellOff, Info, Plus, Trash2 } from "lucide-react";
import { canDeleteAlarm, canDismissAlarm, canSnoozeAlarm, canSwitchAlarm, type Alarm, type AlarmClock } from "../../../gen/clock__alarms.ts";
import { Button, EmptyState, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from "../components/ui/index.ts";
import { cn } from "../lib/cn.ts";
import { DayPicker } from "./DayPicker.tsx";
import { describeDays, wall } from "./text.ts";

/** The browser build's alarms, the page's instant, and each owner decision about an alarm. */
export type AlarmsPanelProps = {
  /** The browser build's alarms. */
  clock: AlarmClock;
  /** The page's latest instant, which the rules check each decision against. */
  now: number;
  /** Sets a new alarm. */
  onAdd: (hour: number, minute: number, label: string, days: number[]) => void;
  onSnooze: (alarm: Alarm) => void;
  onDismiss: (alarm: Alarm) => void;
  onSwitch: (alarm: Alarm, on: boolean) => void;
  onDelete: (alarm: Alarm) => void;
  /** Chooses how long Snooze lasts. */
  onSnoozeMinutes: (minutes: number) => void;
};

/**
 * The browser build's own alarms: they ring only while this page is open and in front.
 * @model spec/clock/alarms.md
 */
export function AlarmsPanel({ clock, now, onAdd, onSnooze, onDismiss, onSwitch, onDelete, onSnoozeMinutes }: AlarmsPanelProps) {
  const [time, setTime] = useState("07:00");
  const [label, setLabel] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const valid = /^([01]\d|2[0-3]):[0-5]\d$/.test(time) && label.length <= 200;
  const add = () => {
    const [hour, minute] = time.split(":").map(Number);
    onAdd(hour, minute, label, days);
    setLabel("");
    setDays([]);
  };
  return (
    <section className="flex flex-col gap-6">
      <span role="img" aria-label="Rings only while this page is open" className="text-muted-foreground"><Info aria-hidden className="size-5" /></span>
      {clock.alarms.length === 0 ? <EmptyState title="No alarms" icon={<AlarmIcon className="size-8" />} /> : (
        <ul className="flex flex-col divide-y divide-border">
          {clock.alarms.map((alarm) => {
            const ringing = alarm.phase === "AlarmRinging";
            const nextAt = now + 60_000;
            return (
              <li key={alarm.id} className={cn("flex flex-col gap-2 py-3", ringing && "text-primary")}>
                <div className="flex items-center gap-3">
                  <span className="font-display text-4xl tabular-nums">{wall(alarm.hour, alarm.minute)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{[alarm.label, describeDays(alarm.days)].filter(Boolean).join(" · ")}</span>
                  {!ringing && (
                    <Switch
                      aria-label={`${alarm.label || wall(alarm.hour, alarm.minute)} on`}
                      checked={alarm.phase === "AlarmSet"}
                      disabled={!canSwitchAlarm(clock, alarm.id, alarm.revision, alarm.phase !== "AlarmSet", nextAt, now)}
                      onCheckedChange={(on) => onSwitch(alarm, on)}
                    />
                  )}
                  <Button variant="ghost" size="icon" aria-label={`Delete ${alarm.label || wall(alarm.hour, alarm.minute)}`} disabled={!canDeleteAlarm(clock, alarm.id, alarm.revision)} onClick={() => onDelete(alarm)}>
                    <Trash2 aria-hidden className="size-4" />
                  </Button>
                </div>
                {ringing && (
                  <div className="flex gap-2">
                    <Button variant="secondary" className="flex-1" disabled={!canSnoozeAlarm(clock, alarm.id, alarm.revision, now)} onClick={() => onSnooze(alarm)}>Snooze</Button>
                    <Button className="flex-1" disabled={!canDismissAlarm(clock, alarm.id, alarm.revision, alarm.days.length ? nextAt : 0, now)} onClick={() => onDismiss(alarm)}>
                      <BellOff aria-hidden className="size-4" />Dismiss
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <form className="flex flex-col gap-3" onSubmit={(event) => { event.preventDefault(); if (valid) add(); }}>
        <div className="flex gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="alarm-time">Time</Label>
            <Input id="alarm-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="alarm-label">Label</Label>
            <Input id="alarm-label" maxLength={200} value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
        </div>
        <DayPicker days={days} onChange={setDays} />
        <Button type="submit" disabled={!valid}><Plus aria-hidden className="size-4" />Save alarm</Button>
      </form>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="alarm-snooze">Snooze</Label>
        <Select value={String(clock.snoozeMinutes)} onValueChange={(value) => onSnoozeMinutes(Number(value))}>
          <SelectTrigger id="alarm-snooze" className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[1, 5, 10, 15, 20, 30, 60].map((m) => <SelectItem key={m} value={String(m)}>{`${m} min`}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}
