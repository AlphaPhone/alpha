// spec/app/clock/alarms.md, "Story: Manage my alarms"; spec/app/clock/alarms.md, "Story: Ring, snooze, dismiss, and recover alarms"
import { Banner, Button, Card, EmptyState, StatusDot, Switch, cn, focusRing } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Clock, Plus, Trash2 } from "lucide-react";
import type { Machine as ClockViewMachine } from "../../gen/app__clock.effect.vibe";
import { useMachine as useClockView } from "../../gen/app__clock.react.ts";
import { useMachine as useAlarms } from "../../gen/app__clock__alarms.react.ts";
import type { Machine as ToastsMachine } from "../../gen/app__notices__toasts.effect.vibe";
import type { Said } from "../notices/toasts.vibe";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { ackMissedAlarm, deleteAlarmWithUndo, dismissAlarm, nextUpcomingAlarm, snoozeAlarm, toggleAlarm } from "./alarms.vibe";
import { alarmMetaOf, soundLabel } from "./records.ts";
import type { ClockResident } from "./sync.vibe";
import { describeDaysMask, formatAlarmCountdown, formatAlarmTime } from "./time.ts";
import { useClockMeta, useClockNow } from "./useClockStore.ts";

export interface AlarmsTabProps {
  /** Clock resident machines and toast service. */
  runtime: ManagedRuntime.ManagedRuntime<ClockResident | ClockViewMachine | ToastsMachine | Said, unknown>;
}

/** Alarms tab with next-alarm summary, missed-alarm notices, instant toggles, and editor triggers. */
export function AlarmsTab({ runtime }: AlarmsTabProps) {
  const alarms = useTimed(runtime, useAlarms);
  const alarmsState = alarms.state;
  const view = useClockView(runtime);
  const meta = useClockMeta(runtime);
  const now = useClockNow(runtime);

  const items = alarmsState?.items ?? [];
  const sorted = [...items].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute) || a.id - b.id);
  const upcoming = nextUpcomingAlarm(sorted);
  const upcomingDisplay = upcoming !== undefined ? formatAlarmTime(upcoming.alarm.hour, upcoming.alarm.minute, meta.hour24) : undefined;
  const missedAlarms = sorted.filter((item) => item.missed);

  const canOpenNew = view.can({ type: "openSheet", sheet: { tag: "NewAlarm" } });
  const openNew = () => {
    if (canOpenNew) void view.send({ type: "openSheet", sheet: { tag: "NewAlarm" } });
  };
  const openEdit = (alarmId: number) => {
    const event = { type: "openSheet", sheet: { tag: "EditAlarm", alarmId } } as const;
    if (view.can(event)) void view.send(event);
  };

  return (
    <section aria-label="Alarms" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {upcoming !== undefined && upcomingDisplay !== undefined ? (
            <p className="text-sm font-medium text-muted-foreground">
              {`${upcomingDisplay.time}${upcomingDisplay.period ? ` ${upcomingDisplay.period}` : ""} · ${now > 0 ? formatAlarmCountdown(upcoming.at, now) : "Scheduled"}`}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming alarms</p>
          )}
        </div>
        <Button size="sm" className="min-h-11" aria-label="Add alarm" disabled={!canOpenNew} onClick={openNew}>
          <Plus aria-hidden className="size-4.5" />
          Add alarm
        </Button>
      </div>

      {missedAlarms.map((item) => {
        const display = formatAlarmTime(item.hour, item.minute, meta.hour24);
        const label = alarmMetaOf(meta, item.id).label;
        const canAck = alarms.can({ type: "ackMissed", id: item.id });
        return (
          <Banner
            key={`missed-${item.id}`}
            variant="warn"
            action={
              <Button
                size="sm"
                variant="ghost"
                className="min-h-11"
                disabled={!canAck}
                onClick={() => void runtime.runPromise(ackMissedAlarm(item.id))}
              >
                Dismiss
              </Button>
            }
          >
            {`Missed alarm: ${display.time}${display.period ? ` ${display.period}` : ""}${label ? ` · ${label}` : ""}`}
          </Banner>
        );
      })}

      {sorted.length === 0 ? (
        <EmptyState icon={<Clock aria-hidden />} title="No alarms set">
          <Button disabled={!canOpenNew} onClick={openNew}>Add alarm</Button>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((item) => {
            const display = formatAlarmTime(item.hour, item.minute, meta.hour24);
            const record = alarmMetaOf(meta, item.id);
            const timeLabel = `${display.time}${display.period ? ` ${display.period}` : ""}`;
            const repeatText = describeDaysMask(item.daysMask);
            const detailParts = [record.label, repeatText, soundLabel(record.sound)].filter((part) => part !== "");
            const canEdit = view.can({ type: "openSheet", sheet: { tag: "EditAlarm", alarmId: item.id } });
            const canDelete = alarms.can({ type: "requestDelete", id: item.id, now: untimed });
            const canToggle = alarms.can({ type: "toggle", id: item.id, on: !item.enabled, fireAt: !item.enabled ? 1 : 0 });
            const canSnooze = alarms.can({ type: "snooze", id: item.id, now: untimed });
            const nextDismissFire = item.daysMask > 0 ? Math.max(now, item.fireAt, item.snoozeUntil, 1) + 31_536_000_000 : 0;
            const canDismiss = alarms.can({ type: "dismiss", id: item.id, nextFireAt: nextDismissFire, now: untimed });
            return (
              <Card key={item.id} className="gap-3 rounded-tile border-0 bg-secondary">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    aria-label={`Edit alarm ${timeLabel}${record.label ? ` ${record.label}` : ""}`}
                    disabled={!canEdit}
                    onClick={() => openEdit(item.id)}
                    className={cn(
                      focusRing,
                      "flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center rounded-md text-left focus-visible:-outline-offset-focus disabled:cursor-not-allowed disabled:opacity-50",
                    )}
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
                      disabled={!canDelete}
                      onClick={() => void runtime.runPromise(deleteAlarmWithUndo(item.id))}
                    >
                      <Trash2 aria-hidden className="size-4.5" />
                    </Button>
                    <Switch
                      aria-label={`Toggle alarm ${timeLabel}`}
                      checked={item.enabled}
                      disabled={!canToggle}
                      onCheckedChange={(checked) => void runtime.runPromise(toggleAlarm(item.id, checked))}
                    />
                  </div>
                </div>

                {item.phase !== "Idle" && (
                  <div className="flex items-center gap-2 pt-1">
                    {item.phase === "Ringing" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="min-h-11 bg-background"
                        disabled={!canSnooze}
                        onClick={() => void runtime.runPromise(snoozeAlarm(item.id))}
                      >
                        {`Snooze ${item.snoozeMinutes}m`}
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="min-h-11"
                      disabled={!canDismiss}
                      onClick={() => void runtime.runPromise(dismissAlarm(item.id))}
                    >
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
