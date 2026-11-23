// spec/clock/alarms.md, "Story: Set an alarm in the browser build"; spec/clock/handoff.md, "Story: Ask Clock for an alarm after I review it"; spec/clock/timers.md, "Story: Time something"; spec/clock/stopwatch.md, "Story: Measure elapsed time"; spec/clock/worldClock.md, "Story: See the time where others are"
import { useState } from "react";
import { Effect } from "effect";
import { ChevronLeft } from "lucide-react";
import { useMachine as useRinger } from "../../../gen/clock__ringer.react.ts";
import { useMachine as useAlarms } from "../../../gen/clock__alarms.react.ts";
import { useMachine as useTimers } from "../../../gen/clock__timers.react.ts";
import { useMachine as useStopwatch } from "../../../gen/clock__stopwatch.react.ts";
import { useMachine as useWorld } from "../../../gen/clock__worldClock.react.ts";
import { useMachine as useHandoff } from "../../../gen/clock__handoff.react.ts";
import { useMachine as useHistory } from "../../../gen/clock__handoffHistory.react.ts";
import { initial as ringerInitial } from "../../../gen/clock__ringer.ts";
import { initial as alarmsInitial } from "../../../gen/clock__alarms.ts";
import { initial as timersInitial } from "../../../gen/clock__timers.ts";
import { initial as stopwatchInitial } from "../../../gen/clock__stopwatch.ts";
import { initial as worldInitial } from "../../../gen/clock__worldClock.ts";
import { initial as handoffInitial } from "../../../gen/clock__handoff.ts";
import { shownStatus, initial as historyInitial } from "../../../gen/clock__handoffHistory.ts";
import { ClockActions } from "../../clock/clock.vibe";
import { ClockHandoff } from "../../clock/handoff.vibe";
import { phoneTimeZone, timeZones } from "../../clock/page.ts";
import type { ScreenProps } from "../app-screen.ts";
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/index.ts";
import { AlarmsPanel } from "./AlarmsPanel.tsx";
import { HandoffPanel } from "./HandoffPanel.tsx";
import { StopwatchPanel } from "./StopwatchPanel.tsx";
import { TimersPanel } from "./TimersPanel.tsx";
import { WorldClockPanel } from "./WorldClockPanel.tsx";
import { runtime } from "../runtime.ts";
import { act, buildInfo } from "../shell/services.ts";

const TABS = ["alarms", "timers", "stopwatch", "world"] as const;
type Tab = (typeof TABS)[number];

const clockDo = (use: (actions: ClockActions.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(ClockActions), use));
const handoffDo = (use: (handoff: ClockHandoff.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(ClockHandoff), use));

/** What the shell gives the Clock app: the tab a route names (alarms, timers, stopwatch or world), and how to leave. */
export type ClockScreenProps = ScreenProps;

/**
 * The Clock app: alarms (the browser build's own, or a reviewed request to Android Clock), timers, the stopwatch and world clocks.
 * @model spec/clock/ringer.md
 */
export function ClockScreen({ route, onClose }: ClockScreenProps) {
  const [tab, setTab] = useState<Tab>(TABS.includes(route as Tab) ? (route as Tab) : "alarms");
  const { state: ringer = ringerInitial } = useRinger(runtime);
  const { state: alarms = alarmsInitial } = useAlarms(runtime);
  const { state: timers = timersInitial } = useTimers(runtime);
  const { state: watch = stopwatchInitial } = useStopwatch(runtime);
  const { state: world = worldInitial } = useWorld(runtime);
  const handoff = useHandoff(runtime);
  const { state: history = historyInitial } = useHistory(runtime);
  const browser = buildInfo().variant === "browser";
  const close = () => {
    handoffDo((h) => h.retire());
    clockDo((a) => a.silence());
    onClose();
  };
  return (
    <main className="flex min-h-full flex-col gap-4 bg-background px-4 pt-4 pb-28 text-foreground">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={close}><ChevronLeft aria-hidden className="size-6" /></Button>
        <h1 className="font-display text-3xl">Clock</h1>
      </header>
      <Tabs value={tab} onValueChange={(value) => { if (tab === "alarms") handoffDo((h) => h.retire()); setTab(value as Tab); }}>
        <TabsList>
          <TabsTrigger value="alarms">Alarms</TabsTrigger>
          <TabsTrigger value="timers">Timers</TabsTrigger>
          <TabsTrigger value="stopwatch">Stopwatch</TabsTrigger>
          <TabsTrigger value="world">World</TabsTrigger>
        </TabsList>
        <TabsContent value="alarms" className="pt-4">
          {browser ? (
            <AlarmsPanel
              clock={alarms}
              now={ringer.now}
              onAdd={(hour, minute, label, days) => clockDo((a) => a.addAlarm(hour, minute, label, days))}
              onSnooze={(alarm) => clockDo((a) => a.snoozeAlarm(alarm.id, alarm.revision))}
              onDismiss={(alarm) => clockDo((a) => Effect.andThen(a.silence(), a.dismissAlarm(alarm.id, alarm.revision)))}
              onSwitch={(alarm, on) => clockDo((a) => a.switchAlarm(alarm.id, alarm.revision, on))}
              onDelete={(alarm) => clockDo((a) => a.deleteAlarm(alarm.id, alarm.revision))}
              onSnoozeMinutes={(minutes) => clockDo((a) => a.setSnoozeMinutes(minutes))}
            />
          ) : (
            <HandoffPanel
              handoff={handoff.state ?? handoffInitial}
              zone={phoneTimeZone()}
              lastStatus={history.writes === 0 ? undefined : shownStatus(history)}
              can={handoff.can}
              send={(event) => { void handoff.send(event); }}
              onPrepare={() => handoffDo((h) => h.prepare())}
              onConfirm={() => handoffDo((h) => h.confirm())}
            />
          )}
        </TabsContent>
        <TabsContent value="timers" className="pt-4">
          <TimersPanel
            timers={timers}
            now={ringer.now}
            onStart={(label, ms) => clockDo((a) => a.startTimer(label, ms))}
            onTimer={(action, timer) => clockDo((a) => a.timer(action, timer.id))}
            onDismiss={(timer) => clockDo((a) => Effect.andThen(a.silence(), a.dismissTimer(timer.id, timer.revision)))}
          />
        </TabsContent>
        <TabsContent value="stopwatch" className="pt-4">
          <StopwatchPanel watch={watch} now={ringer.now} onAction={(action) => clockDo((a) => a.stopwatch(action))} />
        </TabsContent>
        <TabsContent value="world" className="pt-4">
          <WorldClockPanel world={world} now={ringer.now} known={timeZones()} onAdd={(zone) => clockDo((a) => a.addZone(zone))} onRemove={(zone) => clockDo((a) => a.removeZone(zone))} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
