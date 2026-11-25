// spec/app/clock/index.md, "Story: Move between Clock tabs and sheets"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import type { Machine as ClockViewMachine, Tab } from "../../gen/app__clock.effect.vibe";
import { useMachine as useClockView } from "../../gen/app__clock.react.ts";
import type { Machine as StopwatchMachine } from "../../gen/app__clock__stopwatch.effect.vibe";
import type { Machine as ToastsMachine } from "../../gen/app__notices__toasts.effect.vibe";
import type { Said } from "../notices/toasts.vibe";
import { AlarmEditorSheet } from "./AlarmEditorSheet.tsx";
import { AlarmsTab } from "./AlarmsTab.tsx";
import { StopwatchTab } from "./StopwatchTab.tsx";
import type { ClockResident } from "./sync.vibe";
import { TimersTab } from "./TimersTab.tsx";
import { WorldClockTab } from "./WorldClockTab.tsx";

export interface ClockProps {
  /** Provides Clock's resident machines, stopwatch machine, and toast service. */
  runtime: ManagedRuntime.ManagedRuntime<ClockResident | ClockViewMachine | StopwatchMachine | ToastsMachine | Said, unknown>;
}

const TABS: ReadonlyArray<{ readonly value: Tab; readonly label: string }> = [
  { value: "Alarms", label: "Alarms" },
  { value: "Timers", label: "Timers" },
  { value: "Stopwatch", label: "Stopwatch" },
  { value: "World", label: "World" },
];

/**
 * Alpha's Clock screen: Alarms, Timers, Stopwatch, and World Clock tabs with modal editor sheets.
 * @model spec/app/clock/index.md
 */
export function Clock({ runtime }: ClockProps) {
  const view = useClockView(runtime);
  const state = view.state;
  if (!state) return null;

  const closeSheet = () => void view.send({ type: "closeSheet" });

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pt-2 pb-28">
      <Tabs
        value={state.tab}
        onValueChange={(next) => {
          const tab = next as Tab;
          if (view.can({ type: "selectTab", tab })) void view.send({ type: "selectTab", tab });
        }}
      >
        <TabsList aria-label="Clock sections">
          {TABS.map((item) => (
            <TabsTrigger key={item.value} value={item.value} className="px-2 text-xs sm:px-3 sm:text-sm">
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="Alarms">
          <AlarmsTab runtime={runtime} />
        </TabsContent>
        <TabsContent value="Timers">
          <TimersTab runtime={runtime} />
        </TabsContent>
        <TabsContent value="Stopwatch">
          <StopwatchTab runtime={runtime} />
        </TabsContent>
        <TabsContent value="World">
          <WorldClockTab runtime={runtime} />
        </TabsContent>
      </Tabs>

      {state.sheet.tag === "NewAlarm" && (
        <AlarmEditorSheet runtime={runtime} onClose={closeSheet} />
      )}
      {state.sheet.tag === "EditAlarm" && (
        <AlarmEditorSheet runtime={runtime} alarmId={state.sheet.alarmId} onClose={closeSheet} />
      )}
    </div>
  );
}
