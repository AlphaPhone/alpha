// spec/app/clock/alarms.md, "Story: Manage my alarms"; spec/app/clock/timers.md, "Story: Run multiple countdown timers"
import { Card, CardTitle } from "@repo/ui";
import { Effect, type ManagedRuntime } from "effect";
import { useSyncExternalStore } from "react";
import type { Machine as ClockViewMachine, Tab } from "../../gen/app__clock.effect.vibe";
import { useMachine as useClockView } from "../../gen/app__clock.react.ts";
import { useMachine as useAlarms } from "../../gen/app__clock__alarms.react.ts";
import { useMachine as useTimers } from "../../gen/app__clock__timers.react.ts";
import { Machine as ShellMachine } from "../../gen/app__shell.effect.vibe";
import { nextUpcomingAlarm } from "./alarms.vibe";
import { clockRecords } from "./records.ts";
import type { ClockResident } from "./sync.vibe";
import { clockNow } from "./ticker.vibe";
import { formatAlarmCountdown, formatAlarmTime, formatTimerDuration } from "./time.ts";
import { liveRemainingMs } from "./timers.vibe";

export interface ClockHomeCardProps {
  /** Provides Clock's resident machines and the shell machine. */
  runtime: ManagedRuntime.ManagedRuntime<ClockResident | ClockViewMachine | ShellMachine, unknown>;
}

/** Compact Home card surfacing a live running/ringing timer or the next upcoming alarm. */
export function ClockHomeCard({ runtime }: ClockHomeCardProps) {
  const alarmsState = useAlarms(runtime).state;
  const timersState = useTimers(runtime).state;
  const view = useClockView(runtime);
  const meta = useSyncExternalStore(clockRecords.subscribe, clockRecords.snapshot);
  const now = useSyncExternalStore(clockNow.subscribe, clockNow.snapshot);

  const openClockTab = (tab: Tab) => {
    void runtime.runPromise(
      Effect.gen(function* () {
        if (view.can({ type: "selectTab", tab })) yield* Effect.ignore(Effect.promise(() => view.send({ type: "selectTab", tab })));
        const shell = yield* ShellMachine;
        yield* Effect.ignore(shell.receive({ type: "openView", view: "Clock" }));
      }),
    );
  };

  const activeTimer = timersState?.items.find((item) => item.status === "Ringing" || item.status === "Running");
  if (activeTimer) {
    const title = clockRecords.timer(activeTimer.id).label || "Timer";
    const summary = activeTimer.status === "Ringing"
      ? "Time's up"
      : formatTimerDuration(liveRemainingMs(activeTimer, now > 0 ? now : activeTimer.startedAt));
    return (
      <Card asChild className="min-w-64 snap-start">
        <button type="button" className="text-left" aria-label={`Clock timer: ${title} ${summary}`} onClick={() => openClockTab("Timers")}>
          <CardTitle>{title}</CardTitle>
          <span className="font-mono text-sm tabular-nums text-muted-foreground">{summary}</span>
        </button>
      </Card>
    );
  }

  const upcoming = alarmsState ? nextUpcomingAlarm(alarmsState.items) : undefined;
  if (!upcoming) return null;

  const display = formatAlarmTime(upcoming.alarm.hour, upcoming.alarm.minute, meta.hour24);
  const timeText = `${display.time}${display.period ? ` ${display.period}` : ""}`;
  const label = clockRecords.alarm(upcoming.alarm.id).label;
  const detail = now > 0 ? `${timeText} · ${formatAlarmCountdown(upcoming.at, now)}` : timeText;

  return (
    <Card asChild className="min-w-64 snap-start">
      <button type="button" className="text-left" aria-label={`Clock alarm: ${timeText}`} onClick={() => openClockTab("Alarms")}>
        <CardTitle>{label || "Next alarm"}</CardTitle>
        <span className="text-sm tabular-nums text-muted-foreground">{detail}</span>
      </button>
    </Card>
  );
}
