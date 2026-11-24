// spec/clock/alarms.md, "Story: Set an alarm in the browser build"; spec/clock/handoff.md, "Story: Ask Clock for an alarm after I review it"; spec/clock/timers.md, "Story: Time something"; spec/clock/stopwatch.md, "Story: Measure elapsed time"; spec/clock/worldClock.md, "Story: See the time where others are"
import { Effect } from "effect";
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
import { initial as historyInitial } from "../../../gen/clock__handoffHistory.ts";
import { ClockActions } from "../../clock/clock.vibe";
import { ClockHandoff } from "../../clock/handoff.vibe";
import { phoneTimeZone, timeZones } from "../../clock/page.ts";
import type { ScreenProps } from "../app-screen.ts";
import { ClockScreenView } from "./ClockScreenView.tsx";
import { runtime } from "../runtime.ts";
import { act, buildInfo } from "../shell/services.ts";

const clockDo = (use: (actions: ClockActions.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(ClockActions), use));
const handoffDo = (use: (handoff: ClockHandoff.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(ClockHandoff), use));

/** What the shell gives the Clock app: the tab a route names (alarms, timers, stopwatch or world), and how to leave. */
export type ClockScreenProps = ScreenProps;

/**
 * The Clock app: alarms (the browser build's own, or a reviewed request to Android Clock), timers, the stopwatch and world clocks.
 * @model spec/clock/ringer.md
 */
export function ClockScreen({ route, onClose }: ClockScreenProps) {
  const { state: ringer = ringerInitial } = useRinger(runtime);
  const { state: alarms = alarmsInitial } = useAlarms(runtime);
  const { state: timers = timersInitial } = useTimers(runtime);
  const { state: watch = stopwatchInitial } = useStopwatch(runtime);
  const { state: world = worldInitial } = useWorld(runtime);
  const handoff = useHandoff(runtime);
  const { state: history = historyInitial } = useHistory(runtime);
  return (
    <ClockScreenView
      {...(route === undefined ? {} : { route })}
      ringer={ringer}
      alarms={alarms}
      timers={timers}
      watch={watch}
      world={world}
      handoff={handoff.state ?? handoffInitial}
      history={history}
      canHandoff={handoff.can}
      browser={buildInfo().variant === "browser"}
      zone={phoneTimeZone()}
      known={timeZones()}
      onClose={() => {
        handoffDo((h) => h.retire());
        clockDo((a) => a.silence());
        onClose();
      }}
      onLeaveAlarms={() => handoffDo((h) => h.retire())}
      alarmActions={{
        onAdd: (hour, minute, label, days) => clockDo((a) => a.addAlarm(hour, minute, label, days)),
        onSnooze: (alarm) => clockDo((a) => a.snoozeAlarm(alarm.id, alarm.revision)),
        onDismiss: (alarm) => clockDo((a) => Effect.andThen(a.silence(), a.dismissAlarm(alarm.id, alarm.revision))),
        onSwitch: (alarm, on) => clockDo((a) => a.switchAlarm(alarm.id, alarm.revision, on)),
        onDelete: (alarm) => clockDo((a) => a.deleteAlarm(alarm.id, alarm.revision)),
        onSnoozeMinutes: (minutes) => clockDo((a) => a.setSnoozeMinutes(minutes)),
      }}
      handoffActions={{
        send: (event) => { void handoff.send(event); },
        onPrepare: () => handoffDo((h) => h.prepare()),
        onConfirm: () => handoffDo((h) => h.confirm()),
      }}
      timerActions={{
        onStart: (label, ms) => clockDo((a) => a.startTimer(label, ms)),
        onTimer: (action, timer) => clockDo((a) => a.timer(action, timer.id)),
        onDismiss: (timer) => clockDo((a) => Effect.andThen(a.silence(), a.dismissTimer(timer.id, timer.revision))),
      }}
      onStopwatch={(action) => clockDo((a) => a.stopwatch(action))}
      worldActions={{ onAdd: (zone) => clockDo((a) => a.addZone(zone)), onRemove: (zone) => clockDo((a) => a.removeZone(zone)) }}
    />
  );
}
