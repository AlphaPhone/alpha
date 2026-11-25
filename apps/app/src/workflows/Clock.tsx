// spec/app/workflows/clock.md, "Story: Describe an alarm for Clock"; spec/app/workflows/clock.md, "Story: Review, then hand over to Clock"; spec/app/workflows/clock.md, "Story: Know what happened"
import { Alert, Button, ConfirmDialog, Input, Spinner } from "@repo/ui";
import { ExternalLink } from "lucide-react";
import { useMachine } from "../../gen/app__workflows__clock.react.ts";
import { type Event, type Handoff, type Receipt, busy, maxLabel, maxSnooze } from "../../gen/app__workflows__clock.ts";
import type { Machine } from "../../gen/app__workflows__clock.effect.vibe";
import type { Resident, Shown } from "../runtime/area.tsx";
import { AlarmLabel, reviewAlarm, setAlarmLabel } from "./clock.vibe";

interface ClockProps extends Pick<Shown<Resident | Machine | AlarmLabel>, "runtime"> {}

const actions = [
  ["SetAlarm", "Set alarm"], ["ShowAlarms", "Show alarms"], ["Snooze", "Snooze"], ["Dismiss", "Dismiss"],
] as const satisfies readonly (readonly [Handoff, string])[];
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const receipts: Record<Receipt, string> = {
  NoReceipt: "",
  NotSent: "The request wasn’t kept. Clock wasn’t opened.",
  Withdrawn: "The review closed before Clock could open.",
  ClockOpened: "Clock opened. Check Clock to see whether it kept the alarm.",
  ClockUnavailable: "There’s no Clock app that can open this request.",
  ClockDenied: "Android didn’t allow this request.",
  ClockFailed: "Clock couldn’t open this request.",
  Unclear: "Clock didn’t confirm that it opened. Check Clock before trying again.",
};

function reviewText(kind: Handoff, time: string, label: string, snooze: number, repeat: string) {
  if (kind === "SetAlarm") return [`Alarm at ${time}`, label, repeat || "Once"].filter(Boolean).join(" · ");
  if (kind === "Snooze") return `Ask Clock to snooze its current alarm for ${snooze} minutes.`;
  if (kind === "Dismiss") return "Ask Clock to dismiss its current alarm.";
  return "Open your alarms in Clock.";
}

/** Review a Clock handoff inside Workflows. Clock reports only whether it opened. */
export function ClockPage({ runtime }: ClockProps) {
  const machine = useMachine(runtime);
  const state = machine.state;
  if (!state?.open) return null;
  const tell = (event: Event) => { if (machine.can(event)) void machine.send(event); };
  const label = runtime.runSync(AlarmLabel.use((value) => value.read()));
  const time = `${String(state.hour).padStart(2, "0")}:${String(state.minute).padStart(2, "0")}`;
  const repeating = days.filter((_, index) => state.days.includes(index + 1)).join(", ");
  const receipt = state.receipt === "NoReceipt" ? state.lastReceipt : state.receipt;
  const disabled = busy(state);
  if (!state.clock) return <Alert role="status">Clock isn’t available on this device.</Alert>;
  return <section aria-label="Clock alarms" className="flex flex-col gap-4">
    <div className="grid grid-cols-2 gap-2">
      {actions.map(([kind, title]) => <Button key={kind} variant={kind === state.kind ? "primary" : "secondary"} aria-pressed={kind === state.kind}
        disabled={disabled} onClick={() => tell({ type: "pick", wanted: kind })}>{title}</Button>)}
    </div>
    {state.kind === "SetAlarm" && <>
      <label className="grid gap-1 text-sm">Alarm time
        <Input type="time" value={time} disabled={disabled} onChange={(event) => {
          const [hour, minute] = event.currentTarget.value.split(":").map(Number);
          if (hour !== undefined && minute !== undefined) tell({ type: "setTime", hour, minute });
        }} />
      </label>
      <label className="grid gap-1 text-sm">Label
        <Input value={label} maxLength={maxLabel} disabled={disabled} onChange={(event) => void runtime.runPromiseExit(setAlarmLabel(event.currentTarget.value))} />
      </label>
      {state.repeats && <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-2 text-sm">Repeat</legend>
        {days.map((day, index) => <Button key={day} size="sm" variant={state.days.includes(index + 1) ? "primary" : "secondary"}
          aria-label={day} aria-pressed={state.days.includes(index + 1)} disabled={disabled}
          onClick={() => tell({ type: "toggleDay", day: index + 1 })}>{day.slice(0, 3)}</Button>)}
        <p className="w-full text-sm text-muted-foreground">{repeating || "Once"}</p>
      </fieldset>}
    </>}
    {state.kind === "Snooze" && <label className="grid gap-1 text-sm">Snooze minutes
      <Input type="number" min={1} max={maxSnooze} value={state.snooze} disabled={disabled}
        onChange={(event) => tell({ type: "setSnooze", minutes: event.currentTarget.valueAsNumber })} />
    </label>}
    {state.history.status === "Loading" && <Spinner aria-label="Reading the last Clock request" />}
    {state.history.status === "Failed" && <Button variant="secondary" onClick={() => tell({ type: "retryHistory" })}>Retry Clock history</Button>}
    {machine.can({ type: "prepare" }) && <Button onClick={() => void runtime.runPromiseExit(reviewAlarm())}>Review<ExternalLink aria-hidden /></Button>}
    {disabled && <Spinner aria-label="Opening Clock" />}
    {receipt !== "NoReceipt" && <Alert role="status" variant={receipt === "ClockOpened" ? "ok" : "warn"}>{receipts[receipt]}</Alert>}
    <ConfirmDialog open={state.review.showing} title="Open Clock?" confirmLabel="Open Clock"
      onConfirm={() => tell({ type: "confirm" })} onCancel={() => tell({ type: "cancelReview" })}>
      {reviewText(state.kind, time, label, state.snooze, repeating)}
    </ConfirmDialog>
  </section>;
}
