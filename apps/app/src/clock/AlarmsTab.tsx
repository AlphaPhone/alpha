// spec/app/clock/alarms.md, "Story: Manage my alarms"; spec/app/clock/alarms.md, "Story: Ring, snooze, dismiss, and recover alarms"
import { Banner, Button, Card, EmptyState, StatusDot, Switch } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { AlarmClock, BellOff, Plus, Trash2 } from "lucide-react";
import { useSyncExternalStore } from "react";
import type { Machine as ClockViewMachine } from "../../gen/app__clock.effect.vibe";
import { useMachine as useClockView } from "../../gen/app__clock.react.ts";
import { useMachine as useAlarms } from "../../gen/app__clock__alarms.react.ts";
import type { Machine as ToastsMachine } from "../../gen/app__notices__toasts.effect.vibe";
import type { Said } from "../notices/toasts.vibe";
import { ackMissedAlarm, deleteAlarmWithUndo, dismissAlarm, nextUpcomingAlarm, snoozeAlarm, toggleAlarm } from "./alarms.vibe";
import { clockRecords, soundLabel } from "./records.ts";
import type { ClockResident } from "./sync.vibe";
import { clockNow } from "./ticker.vibe";
import { describeDaysMask, formatAlarmCountdown, formatAlarmTime } from "./time.ts";

export interface AlarmsTabProps {
  /** Clock resident machines and toast service. */
  runtime: ManagedRuntime.ManagedRuntime<ClockResident | ClockViewMachine | ToastsMachine | Said, unknown>;
}

/** Alarms tab with next-alarm summary, missed-alarm notices, instant toggles, and editor triggers. */
export function AlarmsTab({ runtime }: AlarmsTabProps) {
  const alarmsState = useAlarms(runtime).state;
  const view = useClockView(runtime);
  const meta = useSyncExternalStore(clockRecords.subscribe, clockRecords.snapshot);
  const now = useSyncExternalStore(clockNow.subscribe, clockNow.snapshot);

  const items = alarmsState?.items ?? [];
  const sorted = [...items].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute) || a.id - b.id);
  const upcoming = nextUpcomingAlarm(sorted);
  const missedAlarms = sorted.filter((item) => item.missed);

  const openNew = () => void view.send({ type: "openSheet", sheet: { tag: "NewAlarm" } });
  const openEdit = (alarmId: number) => void view.send({ type: "openSheet", sheet: { tag: "EditAlarm", alarmId } });

  return (
    <section aria-label="Alarms" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {upcoming !== undefined ? (
            <p className="text-sm font-medium text-muted-foreground">
              {`${formatAlarmTime(upcoming.alarm.hour, upcoming.alarm.minute, meta.hour24).time}${formatAlarmTime(upcoming.alarm.hour, upcoming.alarm.minute, meta.hour24).period ? ` ${formatAlarmTime(upcoming.alarm.hour, upcoming.alarm.minute, meta.hour24).period}` : ""} · ${now > 0 ? formatAlarmCountdown(upcoming.at, now) : "Scheduled"}`}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming alarms</p>
          )}
        </div>
        <Button size="sm" aria-label="Add alarm" disabled={!view.can({ type: "openSheet", sheet: { tag: "NewAlarm" } })} onClick={openNew}>
          <Plus aria-hidden className="size-4" />
          Add alarm
        </Button>
      </div>

      {missedAlarms.map((item) => {
        const display = formatAlarmTime(item.hour, item.minute, meta.hour24);
        const label = clockRecords.alarm(item.id).label;
        return (
          <Banner
            key={`missed-${item.id}`}
            variant="warn"
            action={
              <Button size="sm" variant="ghost" onClick={() => void runtime.runPromise(ackMissedAlarm(item.id))}>
                Dismiss
              </Button>
            }
          >
            {`Missed alarm: ${display.time}${display.period ? ` ${display.period}` : ""}${label ? ` · ${label}` : ""}`}
          </Banner>
        );
      })}

      {sorted.length === 0 ? (
        <EmptyState icon={<AlarmClock aria-hidden />} title="No alarms set">
          <Button onClick={openNew}>Add alarm</Button>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((item) => {
            const display = formatAlarmTime(item.hour, item.minute, meta.hour24);
            const record = clockRecords.alarm(item.id);
            const timeLabel = `${display.time}${display.period ? ` ${display.period}` : ""}`;
            const repeatText = describeDaysMask(item.daysMask);
            const detailParts = [record.label, repeatText, soundLabel(record.sound)].filter((part) => part !== "");
            return (
              <Card key={item.id} className="gap-3">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    aria-label={`Edit alarm ${timeLabel}${record.label ? ` ${record.label}` : ""}`}
                    onClick={() => openEdit(item.id)}
                    className="flex min-w-0 flex-1 flex-col items-start text-left"
                  >
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-3xl font-light tabular-nums ${item.enabled ? "text-foreground" : "text-muted-foreground"}`}>
                        {display.time}
                      </span>
                      {display.period && (
                        <span className="text-sm font-medium text-muted-foreground">{display.period}</span>
                      )}
                      {item.phase === "Ringing" && <StatusDot status="error" label="Ringing" />}
                      {item.phase === "Snoozed" && <StatusDot status="warn" label="Snoozed" />}
                    </div>
                    <span className="truncate text-sm text-muted-foreground">{detailParts.join(" · ")}</span>
                    {item.phase === "Snoozed" && item.snoozeUntil > 0 && now > 0 && (
                      <span className="text-xs font-medium text-warn">
                        {`Snoozed · ${formatAlarmCountdown(item.snoozeUntil, now)}`}
                      </span>
                    )}
                  </button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete alarm ${timeLabel}`}
                      onClick={() => void runtime.runPromise(deleteAlarmWithUndo(item.id))}
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </Button>
                    <Switch
                      aria-label={`Toggle alarm ${timeLabel}`}
                      checked={item.enabled}
                      onCheckedChange={(checked) => void runtime.runPromise(toggleAlarm(item.id, checked))}
                    />
                  </div>
                </div>

                {item.phase !== "Idle" && (
                  <div className="flex items-center gap-2 pt-1">
                    {item.phase === "Ringing" && (
                      <Button variant="secondary" size="sm" onClick={() => void runtime.runPromise(snoozeAlarm(item.id))}>
                        {`Snooze ${item.snoozeMinutes}m`}
                      </Button>
                    )}
                    <Button variant="destructive" size="sm" onClick={() => void runtime.runPromise(dismissAlarm(item.id))}>
                      <BellOff aria-hidden className="size-4" />
                      Dismiss
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
