// spec/clock/alarms.md, "Story: Set an alarm in the browser build"; spec/clock/handoff.md, "Story: Ask Clock for an alarm after I review it"; spec/clock/timers.md, "Story: Time something"; spec/clock/stopwatch.md, "Story: Measure elapsed time"; spec/clock/worldClock.md, "Story: See the time where others are"
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import type { Ringer } from "../../../gen/clock__ringer.ts";
import type { AlarmClock } from "../../../gen/clock__alarms.ts";
import type { Timers } from "../../../gen/clock__timers.ts";
import type { Stopwatch } from "../../../gen/clock__stopwatch.ts";
import type { WorldClock } from "../../../gen/clock__worldClock.ts";
import type { Handoff } from "../../../gen/clock__handoff.ts";
import { shownStatus, type HandoffHistory } from "../../../gen/clock__handoffHistory.ts";
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/index.ts";
import { AlarmsPanel, type AlarmsPanelProps } from "./AlarmsPanel.tsx";
import { HandoffPanel, type HandoffPanelProps } from "./HandoffPanel.tsx";
import { StopwatchPanel, type StopwatchPanelProps } from "./StopwatchPanel.tsx";
import { TimersPanel, type TimersPanelProps } from "./TimersPanel.tsx";
import { WorldClockPanel, type WorldClockPanelProps } from "./WorldClockPanel.tsx";

const TABS = ["alarms", "timers", "stopwatch", "world"] as const;
type Tab = (typeof TABS)[number];

/** The Clock machines' states, the build it runs in, and every owner action on its four tabs. */
export type ClockScreenViewProps = {
  /** The tab a route names: alarms, timers, stopwatch or world. */
  route?: string;
  /** The page's ringer and its latest instant. */
  ringer: Ringer;
  /** The browser build's own alarms. */
  alarms: AlarmClock;
  timers: Timers;
  watch: Stopwatch;
  world: WorldClock;
  /** The reviewed request to Android Clock, on the phone. */
  handoff: Handoff;
  /** What the latest Clock request recorded. */
  history: HandoffHistory;
  /** Whether the handoff rules allow an event now. */
  canHandoff: HandoffPanelProps["can"];
  /** The browser build keeps its own alarms; the phone hands them to Android Clock. */
  browser: boolean;
  /** The phone's time zone. */
  zone: string;
  /** The zones the phone knows. */
  known: readonly string[];
  /** Leaves Clock, retiring the handoff and silencing what rings. */
  onClose: () => void;
  /** The owner left the Alarms tab. */
  onLeaveAlarms: () => void;
  alarmActions: Pick<AlarmsPanelProps, "onAdd" | "onSnooze" | "onDismiss" | "onSwitch" | "onDelete" | "onSnoozeMinutes">;
  handoffActions: Pick<HandoffPanelProps, "send" | "onPrepare" | "onConfirm">;
  timerActions: Pick<TimersPanelProps, "onStart" | "onTimer" | "onDismiss">;
  onStopwatch: StopwatchPanelProps["onAction"];
  worldActions: Pick<WorldClockPanelProps, "onAdd" | "onRemove">;
};

/**
 * The Clock app as its machines leave it: alarms (the browser build's own, or a reviewed request to Android Clock), timers, the stopwatch and world clocks.
 * @model spec/clock/ringer.md
 */
export function ClockScreenView({
  route, ringer, alarms, timers, watch, world, handoff, history, canHandoff, browser, zone, known,
  onClose, onLeaveAlarms, alarmActions, handoffActions, timerActions, onStopwatch, worldActions,
}: ClockScreenViewProps) {
  const [tab, setTab] = useState<Tab>(TABS.includes(route as Tab) ? (route as Tab) : "alarms");
  return (
    <main className="flex min-h-full flex-col gap-4 bg-background px-4 pt-4 pb-28 text-foreground">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={onClose}><ChevronLeft aria-hidden className="size-6" /></Button>
        <h1 className="font-display text-3xl">Clock</h1>
      </header>
      <Tabs value={tab} onValueChange={(value) => { if (tab === "alarms") onLeaveAlarms(); setTab(value as Tab); }}>
        <TabsList>
          <TabsTrigger value="alarms">Alarms</TabsTrigger>
          <TabsTrigger value="timers">Timers</TabsTrigger>
          <TabsTrigger value="stopwatch">Stopwatch</TabsTrigger>
          <TabsTrigger value="world">World</TabsTrigger>
        </TabsList>
        <TabsContent value="alarms" className="pt-4">
          {browser ? (
            <AlarmsPanel clock={alarms} now={ringer.now} {...alarmActions} />
          ) : (
            <HandoffPanel
              handoff={handoff}
              zone={zone}
              lastStatus={history.writes === 0 ? undefined : shownStatus(history)}
              can={canHandoff}
              {...handoffActions}
            />
          )}
        </TabsContent>
        <TabsContent value="timers" className="pt-4">
          <TimersPanel timers={timers} now={ringer.now} {...timerActions} />
        </TabsContent>
        <TabsContent value="stopwatch" className="pt-4">
          <StopwatchPanel watch={watch} now={ringer.now} onAction={onStopwatch} />
        </TabsContent>
        <TabsContent value="world" className="pt-4">
          <WorldClockPanel world={world} now={ringer.now} known={known} {...worldActions} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
