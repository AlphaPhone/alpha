// spec/app/clock/alarms.md, "Story: Manage my alarms"; spec/app/clock/index.md, "One sheet opens at a time, and editing an alarm requires a positive alarm id"
import { Button, Chip, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, Sheet, SheetContent, Switch } from "@repo/ui";
import { Effect, type ManagedRuntime } from "effect";
import { Minus, Plus, Trash2, Volume2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import type { Machine as ClockViewMachine } from "../../gen/app__clock.effect.vibe";
import { useMachine as useAlarms } from "../../gen/app__clock__alarms.react.ts";
import type { Machine as ToastsMachine } from "../../gen/app__notices__toasts.effect.vibe";
import type { Said } from "../notices/toasts.vibe";
import { createAlarm, deleteAlarmWithUndo, updateAlarm } from "./alarms.vibe";
import { playChimePulse } from "./chime.ts";
import { ALARM_SOUNDS, type AlarmSound, SNOOZE_OPTIONS, clockRecords } from "./records.ts";
import type { ClockResident } from "./sync.vibe";
import { clockNow } from "./ticker.vibe";
import {
  DAYS_MASK_EVERY_DAY,
  DAYS_MASK_WEEKDAYS,
  DAYS_MASK_WEEKENDS,
  DAY_FULL_NAMES,
  DAY_INITIALS,
  formatAlarmCountdown,
  formatAlarmTime,
  hasDayBit,
  nextAlarmFireAt,
  toggleDayBit,
} from "./time.ts";

export interface AlarmEditorSheetProps {
  /** Resident Clock runtime plus Toasts for undoable delete. */
  runtime: ManagedRuntime.ManagedRuntime<ClockResident | ClockViewMachine | ToastsMachine | Said, unknown>;
  /** Alarm id being edited, or undefined when creating a new alarm. */
  alarmId?: number;
  /** Called when the sheet closes or finishes saving/deleting. */
  onClose: () => void;
}

/** Apple/Google-grade bottom sheet for creating or editing an alarm. */
export function AlarmEditorSheet({ runtime, alarmId, onClose }: AlarmEditorSheetProps) {
  const alarmsState = useAlarms(runtime).state;
  const meta = useSyncExternalStore(clockRecords.subscribe, clockRecords.snapshot);
  const now = useSyncExternalStore(clockNow.subscribe, clockNow.snapshot);
  const existing = alarmId !== undefined ? alarmsState?.items.find((item) => item.id === alarmId) : undefined;
  const existingMeta = alarmId !== undefined ? clockRecords.alarm(alarmId) : undefined;

  const [hour, setHour] = useState<number>(() => existing?.hour ?? 7);
  const [minute, setMinute] = useState<number>(() => existing?.minute ?? 0);
  const [daysMask, setDaysMask] = useState<number>(() => existing?.daysMask ?? 0);
  const [label, setLabel] = useState<string>(() => existingMeta?.label ?? "");
  const [sound, setSound] = useState<AlarmSound>(() => existingMeta?.sound ?? "radar");
  const [snoozeMinutes, setSnoozeMinutes] = useState<number>(() => existing?.snoozeMinutes ?? 9);
  const [vibrate, setVibrate] = useState<boolean>(() => existing?.vibrate ?? true);

  const display = formatAlarmTime(hour, minute, meta.hour24);
  const previewFire = now > 0 ? nextAlarmFireAt(hour, minute, daysMask, now) : 0;
  const countdownText = previewFire > 0 ? formatAlarmCountdown(previewFire, now) : undefined;

  const adjustHour = (delta: number) => setHour((prev) => (prev + delta + 24) % 24);
  const adjustMinute = (delta: number) => setMinute((prev) => (prev + delta + 60) % 60);
  const togglePeriod = () => setHour((prev) => (prev + 12) % 24);

  const handleSave = () => {
    const draft = { hour, minute, daysMask, label, sound, snoozeMinutes, vibrate };
    const work = existing !== undefined ? Effect.asVoid(updateAlarm(existing.id, draft)) : Effect.asVoid(createAlarm(draft));
    void runtime.runPromise(work).then(() => onClose());
  };

  const handleDelete = () => {
    if (existing === undefined) return;
    void runtime.runPromise(deleteAlarmWithUndo(existing.id)).then(() => onClose());
  };

  return (
    <Sheet open onOpenChange={(opened) => (opened ? undefined : onClose())}>
      <SheetContent
        title={existing !== undefined ? "Edit alarm" : "New alarm"}
        description={countdownText}
        actions={
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            {existing !== undefined && (
              <Button variant="destructive" aria-label="Delete alarm" onClick={handleDelete}>
                <Trash2 aria-hidden className="size-4" />
                Delete
              </Button>
            )}
            <Button onClick={handleSave}>Save</Button>
          </>
        }
      >
        <div className="flex flex-col gap-5 py-2">
          <div className="flex items-center justify-center gap-4 rounded-lg bg-secondary p-4">
            <div className="flex flex-col items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Increase hour" onClick={() => adjustHour(1)}>
                <Plus aria-hidden className="size-4" />
              </Button>
              <span className="text-4xl font-light tabular-nums" aria-label="Selected hour">
                {display.time.split(":")[0]}
              </span>
              <Button variant="ghost" size="icon" aria-label="Decrease hour" onClick={() => adjustHour(-1)}>
                <Minus aria-hidden className="size-4" />
              </Button>
            </div>
            <span className="text-3xl font-light text-muted-foreground">:</span>
            <div className="flex flex-col items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Increase minute" onClick={() => adjustMinute(1)}>
                <Plus aria-hidden className="size-4" />
              </Button>
              <span className="text-4xl font-light tabular-nums" aria-label="Selected minute">
                {display.time.split(":")[1]}
              </span>
              <Button variant="ghost" size="icon" aria-label="Decrease minute" onClick={() => adjustMinute(-1)}>
                <Minus aria-hidden className="size-4" />
              </Button>
            </div>
            {!meta.hour24 && (
              <Button variant="outline" aria-label="Toggle AM or PM" onClick={togglePeriod} className="ml-2">
                {display.period}
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Repeat</Label>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Repeat days">
              {DAY_INITIALS.map((initial, idx) => (
                <Chip
                  key={DAY_FULL_NAMES[idx]}
                  pressed={hasDayBit(daysMask, idx)}
                  aria-label={DAY_FULL_NAMES[idx]}
                  onPressedChange={() => setDaysMask((prev) => toggleDayBit(prev, idx))}
                >
                  {initial}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setDaysMask(DAYS_MASK_WEEKDAYS)}>Weekdays</Button>
              <Button variant="ghost" size="sm" onClick={() => setDaysMask(DAYS_MASK_WEEKENDS)}>Weekends</Button>
              <Button variant="ghost" size="sm" onClick={() => setDaysMask(DAYS_MASK_EVERY_DAY)}>Every day</Button>
              <Button variant="ghost" size="sm" onClick={() => setDaysMask(0)}>One-time</Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="alarm-label-input">Label</Label>
            <Input
              id="alarm-label-input"
              aria-label="Alarm label"
              placeholder="Wake up, workout, medication..."
              maxLength={200}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="alarm-sound-select">Sound</Label>
            <div className="flex items-center gap-2">
              <Select value={sound} onValueChange={(next) => setSound(next as AlarmSound)}>
                <SelectTrigger id="alarm-sound-select" aria-label="Alarm sound" className="flex-1" />
                <SelectContent>
                  {ALARM_SOUNDS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" aria-label="Preview sound" onClick={() => playChimePulse(sound, false)}>
                <Volume2 aria-hidden className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="alarm-snooze-select">Snooze duration</Label>
            <Select value={String(snoozeMinutes)} onValueChange={(next) => setSnoozeMinutes(Number(next))}>
              <SelectTrigger id="alarm-snooze-select" aria-label="Snooze duration" />
              <SelectContent>
                {SNOOZE_OPTIONS.map((mins) => (
                  <SelectItem key={mins} value={String(mins)}>{`${mins} ${mins === 1 ? "minute" : "minutes"}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between py-1">
            <Label htmlFor="alarm-vibrate-switch">Vibrate</Label>
            <Switch id="alarm-vibrate-switch" aria-label="Vibrate" checked={vibrate} onCheckedChange={setVibrate} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
