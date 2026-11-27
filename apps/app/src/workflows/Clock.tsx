// spec/app/workflows/clock.md, "Story: Describe an alarm for Clock"; spec/app/workflows/clock.md, "Story: Review, then hand over to Clock"; spec/app/workflows/clock.md, "Story: Know what happened"
import { Effect, Exit } from "effect";
import { Button, Dialog, DialogContent, DialogTitle, Input, Spinner, aboveDock, cn, dockClearance } from "@repo/ui";
import { ChevronLeft, Share2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Machine as Shell } from "../../gen/app__shell.effect.vibe";
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
const field = "h-auto rounded-lg border-0 p-3.5 text-sm leading-normal";
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
  const labelService = runtime.runSync(AlarmLabel);
  const label = useSyncExternalStore(labelService.subscribe, labelService.snapshot, labelService.snapshot);
  const [snoozeInput, setSnoozeInput] = useState<string | null>(null);
  const state = machine.state;
  if (!state?.open) return null;
  const tell = (event: Event) => { if (machine.can(event)) void machine.send(event); };
  const time = `${String(state.hour).padStart(2, "0")}:${String(state.minute).padStart(2, "0")}`;
  const repeating = repeatDays(state.days);
  const receipt = state.receipt === "NoReceipt" ? state.lastReceipt : state.receipt;
  const disabled = busy(state);
  const close = { type: "closeClock" } as const;
  const canSetTime = machine.can({ type: "setTime", hour: state.hour, minute: state.minute });
  const canSetLabel = machine.can({ type: "setLabel", chars: label.length });
  const canSetSnooze = machine.can({ type: "setSnooze", minutes: state.snooze });
  return <Dialog open modal={false}>
    <DialogContent container={container}
      aria-label="Clock alarms" aria-labelledby={undefined} aria-describedby={undefined}
      className={cn("absolute inset-0 mx-0 max-h-none max-w-none translate-y-0 gap-0 overflow-x-hidden overflow-y-auto rounded-none bg-background px-6 pt-[max(var(--alpha-native-inset-top,0px),env(safe-area-inset-top))] text-foreground shadow-none", dockClearance, aboveDock)}
      onInteractOutside={(event) => event.preventDefault()}
      onEscapeKeyDown={(event) => { event.preventDefault(); tell(close); }}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        void runtime.runPromiseExit(Effect.flatMap(Shell, (shell) => shell.get())).then((exit) => {
          if (Exit.isSuccess(exit) && exit.value.assistant === "Bar") restoreFocus();
        });
      }}>
      <header className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Close Clock" disabled={!machine.can(close)} onClick={() => tell(close)}>
          <ChevronLeft />
        </Button>
        <DialogTitle className="font-display text-home-display leading-normal font-light">Alarms</DialogTitle>
      </header>
      {!state.clock ? <p role="status" className="text-sm text-muted-foreground">Clock isn’t available on this device.</p> : <>
        <div className="mb-6 grid grid-cols-2 gap-2">
          {actions.map(([kind, title]) => {
            const pick = { type: "pick", wanted: kind } as const;
            return <Button key={kind} variant="secondary" aria-pressed={kind === state.kind}
              className={cn("h-auto justify-start rounded-action p-3.5 leading-normal", picked)}
              disabled={kind !== state.kind && !machine.can(pick)} onClick={() => tell(pick)}>{title}</Button>;
          })}
        </div>
        {state.kind === "SetAlarm" && <>
          <label className="mb-4.5 grid gap-2 text-sm leading-normal">Alarm time
            <Input type="time" aria-label="Alarm time" value={time} className={cn(field, "text-title")} disabled={!canSetTime} onChange={(event) => {
              const [hour, minute] = event.currentTarget.value.split(":").map(Number);
              if (hour !== undefined && minute !== undefined) tell({ type: "setTime", hour, minute });
            }} />
          </label>
          <label className="mb-3.5 grid gap-2 text-sm leading-normal">Label
            <Input aria-label="Alarm label" value={label} className={field} maxLength={maxLabel} disabled={!canSetLabel}
              onChange={(event) => void runtime.runPromiseExit(setAlarmLabel(event.currentTarget.value))} />
          </label>
          {state.repeats && <fieldset className="mb-4.5">
            <legend className="mb-2 px-0.5 text-sm leading-normal">Repeat</legend>
            <div className="flex flex-wrap gap-1.5">
              {week.map(([day, name]) => {
                const toggleDay = { type: "toggleDay", day } as const;
                return <Button key={day} variant="secondary" aria-label={`Repeat on ${name}`}
                  className={cn("h-11 min-w-11 px-2.5 leading-normal font-normal", picked)}
                  aria-pressed={state.days.includes(day)} disabled={!machine.can(toggleDay)}
                  onClick={() => tell(toggleDay)}>{name}</Button>;
              })}
            </div>
            <p className="mt-2 text-sm leading-normal text-muted-foreground">{repeating ? `Repeats ${repeating}` : "One time"}</p>
          </fieldset>}
        </>}
        {state.kind === "Snooze" && <label className="mb-4.5 grid gap-2 text-sm leading-normal">Snooze
          <Input aria-label="Snooze minutes" type="number" className={field} min={1} max={maxSnooze}
            value={snoozeInput ?? String(state.snooze)} disabled={!canSetSnooze}
            onChange={(event) => {
              const raw = event.currentTarget.value;
              setSnoozeInput(raw);
              if (raw.trim() === "") return;
              const parsed = Number(raw);
              if (Number.isInteger(parsed) && parsed >= 1 && parsed <= maxSnooze) {
                tell({ type: "setSnooze", minutes: parsed });
              }
            }}
            onBlur={() => setSnoozeInput(null)} />
        </label>}
        {state.history.status === "Loading" && <Spinner aria-label="Reading the last Clock request" />}
        {state.history.status === "Failed" && machine.can({ type: "retryHistory" }) && (
          <Button variant="secondary" onClick={() => tell({ type: "retryHistory" })}>Retry Clock history</Button>
        )}
        <Button className={cn("mt-3 h-auto gap-1.5 rounded-panel p-4", state.review.showing && "disabled:opacity-100")} aria-label="Review Clock request"
          disabled={!machine.can({ type: "prepare" })}
          onClick={() => void runtime.runPromiseExit(reviewAlarm())}>Review<Share2 aria-hidden className="size-4.5" /></Button>
        {state.review.showing && <section aria-label="Clock review" className="mt-4.5 rounded-xl bg-secondary p-4.5">
          <p className="mb-4 inline-block rounded-md bg-accent px-3 py-1.5 text-sm leading-snug font-semibold">{reviewText(state.kind, time, label, state.snooze, repeating)}</p>
          <Button ref={focus} variant="secondary" className="inline-block h-auto rounded-xl bg-foreground px-4.5 py-3.5 leading-normal text-background hover:bg-foreground/90" aria-label="Confirm Clock request"
            disabled={!machine.can({ type: "confirm" })}
            onClick={() => tell({ type: "confirm" })}>Open Clock</Button>
          <Button variant="ghost" className="inline-block h-auto p-3.5 leading-normal font-normal text-muted-foreground" aria-label="Cancel Clock review"
            disabled={!machine.can({ type: "cancelReview" })}
            onClick={() => tell({ type: "cancelReview" })}>Cancel</Button>
        </section>}
        {disabled && <Spinner aria-label="Opening Clock" />}
        <p role="status" className="mt-4.5 text-sm leading-relaxed">{receipts[receipt]}</p>
      </>}
    </DialogContent>
  </Dialog>;
}
