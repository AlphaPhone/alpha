import type { ComponentMeta } from "vibestack/stories";
import { initial as emptyAlarms } from "../../../gen/clock__alarms.ts";
import { initial as emptyTimers } from "../../../gen/clock__timers.ts";
import { initial as emptyStopwatch } from "../../../gen/clock__stopwatch.ts";
import { initial as emptyWorld } from "../../../gen/clock__worldClock.ts";
import { initial as handoff } from "../../../gen/clock__handoff.ts";
import { initial as history } from "../../../gen/clock__handoffHistory.ts";
import type { ClockScreenViewProps } from "./ClockScreenView.tsx";
import { alarms, answered, knownZones, lastHandoffUnknown, manyAlarms, manyZones, reviewing, ringer, sounding, stopwatch, timers, world } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<ClockScreenViewProps> = {
  args: {
    ringer, alarms, timers, watch: stopwatch, world, handoff, history, canHandoff: () => true, browser: true, zone: "Europe/Paris", known: knownZones,
    onClose: none, onLeaveAlarms: none, onStopwatch: none,
    alarmActions: { onAdd: none, onSnooze: none, onDismiss: none, onSwitch: none, onDelete: none, onSnoozeMinutes: none },
    handoffActions: { send: none, onPrepare: none, onConfirm: none },
    timerActions: { onStart: none, onTimer: none, onDismiss: none },
    worldActions: { onAdd: none, onRemove: none },
  },
  examples: {
    Empty: { alarms: emptyAlarms, timers: emptyTimers, watch: emptyStopwatch, world: emptyWorld },
    ManyAlarms: { alarms: manyAlarms },
    Ringing: { ringer: sounding },
    Timers: { route: "timers" },
    Stopwatch: { route: "stopwatch" },
    World: { route: "world", world: manyZones },
    Phone: { browser: false },
    PhoneReviewing: { browser: false, handoff: reviewing },
    PhoneAnswered: { browser: false, handoff: answered },
    PhoneAfterRestart: { browser: false, history: lastHandoffUnknown },
    PhoneRefused: { browser: false, handoff: reviewing, canHandoff: () => false },
  },
};
