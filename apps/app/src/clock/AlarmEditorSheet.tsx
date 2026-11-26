// spec/app/clock/alarms.md, "Story: Manage my alarms"; spec/app/clock/index.md, "One sheet opens at a time, and editing an alarm requires a positive alarm id"
import type { ClockSound } from "@repo/launcher-records";
import { Button, Chip, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, Sheet, SheetContent, Switch } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Minus, Plus, Trash2, Volume2 } from "lucide-react";
import { useState } from "react";
import type { Machine as ClockViewMachine } from "../../gen/app__clock.effect.vibe";
import { useMachine as useClockView } from "../../gen/app__clock.react.ts";
import type { Alarm } from "../../gen/app__clock__alarms.effect.vibe";
import { useMachine as useAlarms } from "../../gen/app__clock__alarms.react.ts";
import { defaultSnooze } from "../../gen/app__clock__alarms.ts";
import type { Machine as ToastsMachine } from "../../gen/app__notices__toasts.effect.vibe";
import type { Said } from "../notices/toasts.vibe";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { createAlarm, deleteAlarmWithUndo, updateAlarm } from "./alarms.vibe";
import { playChimePulse } from "./chime.ts";
import { ALARM_SOUNDS, type AlarmMeta, SNOOZE_OPTIONS, alarmMetaOf, isAlarmSound } from "./records.ts";
import type { ClockResident } from "./sync.vibe";
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
import { useClockMeta, useClockNow } from "./useClockStore.ts";

export interface AlarmEditorSheetProps {
  /** Resident Clock runtime plus Toasts for undoable delete. */
  runtime: ManagedRuntime.ManagedRuntime<ClockResident | ClockViewMachine | ToastsMachine | Said, unknown>;
  /** Alarm id being edited, or undefined when creating a new alarm. */
  alarmId?: number;
  /** Called when the sheet closes or finishes saving/deleting. */
  onClose: () => void;
}

interface AlarmEditorFormProps {
  readonly runtime: AlarmEditorSheetProps["runtime"];
  readonly existing?: Alarm;
  readonly existingMeta?: AlarmMeta;
  readonly hour24: boolean;
  readonly now: number;
  readonly onClose: () => void;
}

function AlarmEditorForm({ runtime, existing, existingMeta, hour24, now, onClose }: AlarmEditorFormProps) {
  const alarms = useTimed(runtime, useAlarms);
  const view = useClockView(runtime);

  const [hour, setHour] = useState<number>(() => existing?.hour ?? 7);
  const [minute, setMinute] = useState<number>(() => existing?.minute ?? 0);
  const [daysMask, setDaysMask] = useState<number>(() => existing?.daysMask ?? 0);
  const [label, setLabel] = useState<string>(() => existingMeta?.label ?? "");
  const [sound, setSound] = useState<ClockSound>(() => existingMeta?.sound ?? "radar");
  const [snoozeMinutes, setSnoozeMinutes] = useState<number>(() => existing?.snoozeMinutes ?? defaultSnooze);
  const [vibrate, setVibrate] = useState<boolean>(() => existing?.vibrate ?? true);
  const [saving, setSaving] = useState(false);

  const display = formatAlarmTime(hour, minute, hour24);
  const previewFire = now > 0 ? nextAlarmFireAt(hour, minute, daysMask, now) : 0;
  const countdownText = previewFire > 0 ? formatAlarmCountdown(previewFire, now) : undefined;

  const canClose = view.can({ type: "closeSheet" });
  const canSave = existing !== undefined
    ? alarms.can({ type: "update", id: existing.id, hour, minute, daysMask, snoozeMinutes, vibrate, fireAt: 1 })
    : alarms.can({ type: "create", hour, minute, daysMask, snoozeMinutes, vibrate, fireAt: 1 });
  const canDelete = existing !== undefined && alarms.can({ type: "requestDelete", id: existing.id, now: untimed });

  const adjustHour = (delta: number) => setHour((prev) => (prev + delta + 24) % 24);
  const adjustMinute = (delta: number) => setMinute((prev) => (prev + delta + 60) % 60);
  const togglePeriod = () => setHour((prev) => (prev + 12) % 24);

  const handleClose = () => {
    if (canClose) onClose();
  };

  const handleSave = () => {
    if (!canSave || saving) return;
    const draft = { hour, minute, daysMask, label, sound, snoozeMinutes, vibrate };
    setSaving(true);
    if (existing !== undefined) {
      void runtime.runPromise(updateAlarm(existing.id, draft)).then(
        (ok) => {
          setSaving(false);
          if (ok) onClose();
        },
        () => setSaving(false),
      );
      return;
    }
    void runtime.runPromise(createAlarm(draft)).then(
      (createdId) => {
        setSaving(false);
        if (createdId > 0) onClose();
      },
      () => setSaving(false),
    );
  };

  const handleDelete = () => {
    if (existing === undefined || !canDelete || saving) return;
    setSaving(true);
    void runtime.runPromise(deleteAlarmWithUndo(existing.id)).then(
      (ok) => {
        setSaving(false);
        if (ok) onClose();
      },
      () => setSaving(false),
    );
  };

  return (
    <Sheet open onOpenChange={(opened) => (opened ? undefined : handleClose())}>
      <SheetContent
        title={existing !== undefined ? "Edit alarm" : "New alarm"}
        description={countdownText}
        actions={
          <>
            <Button variant="ghost" disabled={!canClose || saving} onClick={handleClose}>Cancel</Button>
            {existing !== undefined && (
              <Button variant="destructive" aria-label="Delete alarm" disabled={!canDelete || saving} onClick={handleDelete}>
                <Trash2 aria-hidden className="size-4.5" />
                Delete
              </Button>
            )}
            <Button disabled={!canSave || saving} onClick={handleSave}>Save</Button>
          </>
        }
      >
        <div className="flex flex-col gap-5 py-2">
          <div className="flex items-center justify-center gap-4 rounded-lg bg-secondary p-4">
            <div className="flex flex-col items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Increase hour" onClick={() => adjustHour(1)}>
                <Plus aria-hidden className="size-4.5" />
              </Button>
              <span className="text-4xl font-light tabular-nums" aria-label="Selected hour">
                {display.time.split(":")[0]}
              </span>
              <Button variant="ghost" size="icon" aria-label="Decrease hour" onClick={() => adjustHour(-1)}>
                <Minus aria-hidden className="size-4.5" />
              </Button>
            </div>
            <span className="text-3xl font-light text-muted-foreground">:</span>
            <div className="flex flex-col items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Increase minute" onClick={() => adjustMinute(1)}>
                <Plus aria-hidden className="size-4.5" />
              </Button>
              <span className="text-4xl font-light tabular-nums" aria-label="Selected minute">
                {display.time.split(":")[1]}
              </span>
              <Button variant="ghost" size="icon" aria-label="Decrease minute" onClick={() => adjustMinute(-1)}>
                <Minus aria-hidden className="size-4.5" />
              </Button>
            </div>
            {!hour24 && (
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
              <Button variant="ghost" size="sm" className="min-h-11" onClick={() => setDaysMask(DAYS_MASK_WEEKDAYS)}>Weekdays</Button>
              <Button variant="ghost" size="sm" className="min-h-11" onClick={() => setDaysMask(DAYS_MASK_WEEKENDS)}>Weekends</Button>
              <Button variant="ghost" size="sm" className="min-h-11" onClick={() => setDaysMask(DAYS_MASK_EVERY_DAY)}>Every day</Button>
              <Button variant="ghost" size="sm" className="min-h-11" onClick={() => setDaysMask(0)}>One-time</Button>
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
              <Select value={sound} onValueChange={(next) => { if (isAlarmSound(next)) setSound(next); }}>
                <SelectTrigger id="alarm-sound-select" aria-label="Alarm sound" className="flex-1" />
                <SelectContent>
                  {ALARM_SOUNDS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" aria-label="Preview sound" onClick={() => playChimePulse(sound, false)}>
                <Volume2 aria-hidden className="size-4.5" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="alarm-snooze-select">Snooze duration</Label>
            <Select
              value={String(snoozeMinutes)}
              onValueChange={(next) => {
                const parsed = Number(next);
                if (Number.isInteger(parsed) && SNOOZE_OPTIONS.includes(parsed)) setSnoozeMinutes(parsed);
              }}
            >
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

/** Bottom sheet for creating or editing an alarm. */
export function AlarmEditorSheet({ runtime, alarmId, onClose }: AlarmEditorSheetProps) {
  const alarmsState = useAlarms(runtime).state;
  const meta = useClockMeta(runtime);
  const now = useClockNow(runtime);

  if (alarmId !== undefined && alarmsState === undefined) {
    return (
      <Sheet open onOpenChange={(opened) => (opened ? undefined : onClose())}>
        <SheetContent title="Edit alarm" description="Loading alarm settings...">
          <div className="py-6 text-center text-sm text-muted-foreground">Loading...</div>
        </SheetContent>
      </Sheet>
    );
  }

  const existing = alarmId !== undefined ? alarmsState?.items.find((item) => item.id === alarmId) : undefined;
  if (alarmId !== undefined && existing === undefined) {
    return (
      <Sheet open onOpenChange={(opened) => (opened ? undefined : onClose())}>
        <SheetContent
          title="Edit alarm"
          description="This alarm is no longer available."
          actions={<Button variant="ghost" onClick={onClose}>Close</Button>}
        >
          <div className="py-4 text-sm text-muted-foreground">Alarm not found.</div>
        </SheetContent>
      </Sheet>
    );
  }

  const existingMeta = existing !== undefined ? alarmMetaOf(meta, existing.id) : undefined;
  const formKey = existing !== undefined ? `edit-${existing.id}-${existing.revision}` : "new";

  return (
    <AlarmEditorForm
      key={formKey}
      runtime={runtime}
      existing={existing}
      existingMeta={existingMeta}
      hour24={meta.hour24}
      now={now}
      onClose={onClose}
    />
  );
}
