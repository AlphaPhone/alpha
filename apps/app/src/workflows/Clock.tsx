// spec/app/workflows/clock.md, "Story: Describe an alarm for Clock"; spec/app/workflows/clock.md, "Story: Review, then hand over to Clock"; spec/app/workflows/clock.md, "Story: Know what happened"
import { Effect } from "effect";
import { Button, Dialog, DialogContent, DialogTitle, Input, Spinner, cn } from "@repo/ui";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { useMachine } from "../../gen/app__workflows__clock.react.ts";
import { type Event, type Handoff, type Receipt, busy, maxLabel, maxSnooze } from "../../gen/app__workflows__clock.ts";
import type { Machine } from "../../gen/app__workflows__clock.effect.vibe";
import type { Resident, Shown } from "../runtime/area.tsx";
import { AlarmLabel, reviewAlarm, setAlarmLabel } from "./clock.vibe";

type ClockProps = Pick<Shown<Resident | Machine | AlarmLabel>, "runtime"> & {
  container: HTMLElement;
  restoreFocus: () => void;
};

const actions = [
  ["SetAlarm", "Set alarm"], ["ShowAlarms", "Show alarms"], ["Snooze", "Snooze"], ["Dismiss", "Dismiss"],
] as const satisfies readonly (readonly [Handoff, string])[];
const week = [[2, "Mon"], [3, "Tue"], [4, "Wed"], [5, "Thu"], [6, "Fri"], [7, "Sat"], [1, "Sun"]] as const;
const picked = "aria-pressed:bg-foreground aria-pressed:text-background";
const field = "h-auto rounded-lg border-0 p-3.5 text-sm";
const focus = (button: HTMLButtonElement | null) => { button?.focus(); };

function repeatDays(days: readonly number[]) {
  if (days.length === 7) return "every day";
  if (days.length === 5 && !days.includes(1) && !days.includes(7)) return "weekdays";
  if (days.length === 2 && days.includes(1) && days.includes(7)) return "weekends";
  return week.filter(([day]) => days.includes(day)).map(([, label]) => label).join(", ");
}

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
  if (kind === "SetAlarm") return [time, repeat, label].filter(Boolean).join(" · ");
  if (kind === "Snooze") return `Snooze: ${snooze} min requested. Clock may use its default duration and affect all ringing alarms.`;
  if (kind === "Dismiss") return "Dismiss alarm. Clock may ask which one. A one-time alarm is disabled; a repeating alarm skips its next occurrence.";
  return "";
}

/** Review a Clock handoff inside Workflows. Clock reports only whether it opened. */
export function ClockPage({ runtime, container, restoreFocus }: ClockProps) {
  const machine = useMachine(runtime);
  const state = machine.state;
  if (!state?.open) return null;
  const tell = (event: Event) => { if (machine.can(event)) void machine.send(event); };
  const label = runtime.runSync(Effect.flatMap(AlarmLabel, (value) => value.read()));
  const time = `${String(state.hour).padStart(2, "0")}:${String(state.minute).padStart(2, "0")}`;
  const repeating = repeatDays(state.days);
  const receipt = state.receipt === "NoReceipt" ? state.lastReceipt : state.receipt;
  const disabled = busy(state);
  const close = { type: "closeClock" } as const;
  return <Dialog open>
    <DialogContent container={container} overlayClassName="absolute bg-transparent dark:bg-transparent"
      aria-label="Clock alarms" aria-labelledby={undefined} aria-describedby={undefined}
      className="absolute inset-0 mx-0 max-w-none translate-y-0 gap-0 overflow-auto rounded-none bg-background px-6 pt-[max(var(--alpha-native-inset-top,0px),env(safe-area-inset-top))] pb-30 text-foreground shadow-none"
      onInteractOutside={(event) => event.preventDefault()}
      onEscapeKeyDown={(event) => { event.preventDefault(); tell(close); }}
      onCloseAutoFocus={(event) => { event.preventDefault(); restoreFocus(); }}>
      <header className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Close Clock" disabled={!machine.can(close)} onClick={() => tell(close)}>
          <ChevronLeft />
        </Button>
        <DialogTitle className="font-display text-home-display font-light">Alarms</DialogTitle>
      </header>
      {!state.clock ? <p role="status" className="text-sm text-muted-foreground">Clock isn’t available on this device.</p> : <>
        <div className="mb-6 grid grid-cols-2 gap-2">
          {actions.map(([kind, title]) => <Button key={kind} variant="secondary" aria-pressed={kind === state.kind}
            className={cn("h-auto rounded-action p-3.5", picked)}
            disabled={disabled} onClick={() => tell({ type: "pick", wanted: kind })}>{title}</Button>)}
        </div>
        {state.kind === "SetAlarm" && <>
          <label className="mb-4.5 grid gap-2 text-sm">Alarm time
            <Input type="time" aria-label="Alarm time" value={time} className={cn(field, "text-title")} disabled={disabled} onChange={(event) => {
              const [hour, minute] = event.currentTarget.value.split(":").map(Number);
              if (hour !== undefined && minute !== undefined) tell({ type: "setTime", hour, minute });
            }} />
          </label>
          <label className="mb-3.5 grid gap-2 text-sm">Label
            <Input aria-label="Alarm label" value={label} className={field} maxLength={maxLabel} disabled={disabled}
              onChange={(event) => void runtime.runPromiseExit(setAlarmLabel(event.currentTarget.value))} />
          </label>
          {state.repeats && <fieldset className="mb-4.5">
            <legend className="mb-2 text-sm">Repeat</legend>
            <div className="flex flex-wrap gap-1.5">
              {week.map(([day, name]) => <Button key={day} variant="secondary" aria-label={`Repeat on ${name}`}
                className={cn("size-11 min-w-11 px-2.5", picked)}
                aria-pressed={state.days.includes(day)} disabled={disabled}
                onClick={() => tell({ type: "toggleDay", day })}>{name}</Button>)}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{repeating ? `Repeats ${repeating}` : "One time"}</p>
          </fieldset>}
        </>}
        {state.kind === "Snooze" && <label className="mb-4.5 grid gap-2 text-sm">Snooze
          <Input aria-label="Snooze minutes" type="number" className={field} min={1} max={maxSnooze} value={state.snooze} disabled={disabled}
            onChange={(event) => tell({ type: "setSnooze", minutes: event.currentTarget.valueAsNumber })} />
        </label>}
        {state.history.status === "Loading" && <Spinner aria-label="Reading the last Clock request" />}
        {state.history.status === "Failed" && <Button variant="secondary" onClick={() => tell({ type: "retryHistory" })}>Retry Clock history</Button>}
        <Button className="mt-3 h-auto gap-1.5 rounded-panel p-4" aria-label="Review Clock request"
          disabled={!machine.can({ type: "prepare" })}
          onClick={() => void runtime.runPromiseExit(reviewAlarm())}>Review<ExternalLink aria-hidden className="size-4.5" /></Button>
        {state.review.showing && <section aria-label="Clock review" className="mt-4.5 rounded-xl bg-secondary p-4.5">
          <p className="mb-4 inline-block rounded-md bg-accent px-3 py-1.5 text-sm leading-snug font-semibold">{reviewText(state.kind, time, label, state.snooze, repeating)}</p>
          <div className="flex flex-wrap">
            <Button ref={focus} variant="secondary" className="h-auto rounded-xl bg-foreground px-4.5 py-3.5 text-background hover:bg-foreground/90" aria-label="Confirm Clock request"
              onClick={() => tell({ type: "confirm" })}>Open Clock</Button>
            <Button variant="ghost" className="h-auto p-3.5 text-muted-foreground" aria-label="Cancel Clock review"
              onClick={() => tell({ type: "cancelReview" })}>Cancel</Button>
          </div>
        </section>}
        {disabled && <Spinner aria-label="Opening Clock" />}
        <p role="status" className="mt-4.5 text-sm leading-relaxed">{receipts[receipt]}</p>
      </>}
    </DialogContent>
  </Dialog>;
}
