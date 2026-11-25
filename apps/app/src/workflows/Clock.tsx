// spec/app/workflows/clock.md, "Story: Describe an alarm for Clock"; spec/app/workflows/clock.md, "Story: Review, then hand over to Clock"; spec/app/workflows/clock.md, "Story: Know what happened"
import { Button, Card, CardFooter, Chip, EmptyState, Input, ListGroup, ListRow, Spinner } from "@repo/ui";
import { AlarmClock, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useMachine } from "../../gen/app__workflows__clock.react.ts";
import { busy } from "../../gen/app__workflows__clock.ts";
import type { Clock as State, Handoff, Receipt } from "../../gen/app__workflows__clock.ts";
import type { Resident, Shown } from "../runtime/area.tsx";
import type { Layer } from "effect";
import { Label, type clock, clockHere } from "./clock.vibe";

const kinds: ReadonlyArray<{ kind: Handoff; label: string }> = [
  { kind: "SetAlarm", label: "Set alarm" }, { kind: "ShowAlarms", label: "Show alarms" }, { kind: "Snooze", label: "Snooze" }, { kind: "Dismiss", label: "Dismiss" },
];

/** Monday first, as the week reads; 1 is Sunday, as Clock counts. */
const week: ReadonlyArray<{ day: number; short: string; name: string }> = [
  { day: 2, short: "Mon", name: "Monday" }, { day: 3, short: "Tue", name: "Tuesday" }, { day: 4, short: "Wed", name: "Wednesday" },
  { day: 5, short: "Thu", name: "Thursday" }, { day: 6, short: "Fri", name: "Friday" }, { day: 7, short: "Sat", name: "Saturday" }, { day: 1, short: "Sun", name: "Sunday" },
];

/** v121's sentence for each answer (legacy ui/clock/clock-handoff-presentation.ts, CLOCK_STATUS_TEXT). */
const answered: Record<Receipt, string> = {
  NoReceipt: "",
  NotSent: "Not sent.",
  Withdrawn: "Not sent.",
  ClockOpened: "Sent to Clock. Check the Clock app; Alpha can’t confirm an alarm changed.",
  ClockUnavailable: "Clock isn’t available for this.",
  ClockDenied: "Android didn’t allow this Clock action.",
  ClockFailed: "Not sent.",
  Unclear: "Alpha can’t tell whether Clock got the request. Check Clock before trying again.",
};

const pad = (value: number) => String(value).padStart(2, "0");

/** The days chosen, as v121 said them (describeClockDays): Sunday first, as Clock counts. */
function daysOf(days: readonly number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 7) return "every day";
  if (sorted.join() === "2,3,4,5,6") return "weekdays";
  if (sorted.join() === "1,7") return "weekends";
  return sorted.map((day) => week.find((one) => one.day === day)?.short ?? "").join(", ");
}

/** What Clock will be asked, exactly as it will be handed over, in v121's words (describeClockHandoff). */
function reviewOf(state: State, typed: string): string {
  if (state.kind === "SetAlarm") {
    const repeat = state.days.length === 0 ? "" : `, repeating ${daysOf(state.days)}`;
    const named = state.label === 0 ? "" : ` named “${typed}”`;
    return `Ask Clock to set ${pad(state.hour)}:${pad(state.minute)}${repeat}${named}. Review the alarm in Clock; Alpha can’t confirm creation or ringing.`;
  }
  if (state.kind === "ShowAlarms") return "Open Clock’s alarms page.";
  if (state.kind === "Snooze") return `Open Clock so you can choose the intended alarm and snooze it yourself. Select the duration there; ${state.snooze} minutes will not be applied automatically.`;
  return "Open Clock so you can choose the intended alarm and dismiss it yourself. Alpha will not dismiss or disable an alarm automatically.";
}

type Runtime = Shown<Layer.Success<typeof clock> | Resident>["runtime"];

/** The row in Workflows that opens the Clock page, and the page: what to ask of Clock, its review and Clock's answer. */
export function Clock({ runtime }: { runtime: Runtime }) {
  const { state, can, send } = useMachine(runtime);
  const [typed, setTyped] = useState("");
  const [snooze, setSnooze] = useState<string | undefined>(undefined);
  if (!state) return null;
  if (!state.open) {
    return (
      <ListGroup>
        <ListRow title="Android Clock" aria-label="Android Clock" leading={<AlarmClock />} trailing={<ChevronRight aria-hidden className="size-5" />} disabled={!can({ type: "openClock", available: true })} onClick={() => void send({ type: "openClock", available: runtime.runSync(clockHere()) })} />
      </ListGroup>
    );
  }
  const label = (text: string) => {
    if (!can({ type: "setLabel", chars: text.length })) return;
    runtime.runSync(Label.use((held) => held.set(text)));
    setTyped(text);
    void send({ type: "setLabel", chars: text.length });
  };
  const time = (value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    if (hour !== undefined && minute !== undefined && can({ type: "setTime", hour, minute })) void send({ type: "setTime", hour, minute });
  };
  const minutes = (value: string) => {
    setSnooze(value);
    const asked = Number(value);
    if (Number.isInteger(asked) && can({ type: "setSnooze", minutes: asked })) void send({ type: "setSnooze", minutes: asked });
  };
  const said = answered[state.receipt] || (state.lastReceipt === "NoReceipt" ? "" : `Last time: ${answered[state.lastReceipt]}`);
  return (
    <section aria-label="Android Clock" className="flex flex-col gap-5 px-4 pb-4">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Close Clock" disabled={!can({ type: "closeClock" })} onClick={() => void send({ type: "closeClock" })}><ChevronLeft /></Button>
        <h2 className="text-xl font-semibold">Android Clock</h2>
      </header>
      {!state.clock ? <EmptyState icon={<AlarmClock />} title="No Clock app on this device" /> : state.history.status === "Loading" ? <Spinner aria-label="Reading the last Clock request" /> : state.history.status === "Failed" ? (
        <Button variant="secondary" onClick={() => void send({ type: "retryHistory" })} disabled={!can({ type: "retryHistory" })}>Try again</Button>
      ) : (
        <>
          {said ? <p role="status" className="text-sm text-muted-foreground">{said}</p> : null}
          <div role="radiogroup" aria-label="What Clock should do" className="flex flex-wrap gap-2">
            {kinds.map(({ kind, label: name }) => (
              <Chip key={kind} role="radio" aria-checked={state.kind === kind} pressed={state.kind === kind} disabled={state.kind !== kind && !can({ type: "pick", wanted: kind })} onPressedChange={() => { if (can({ type: "pick", wanted: kind })) void send({ type: "pick", wanted: kind }); }}>{name}</Chip>
            ))}
          </div>
          {state.kind === "SetAlarm" ? (
            <>
              <Input type="time" aria-label="Alarm time" required value={`${pad(state.hour)}:${pad(state.minute)}`} disabled={busy(state)} onChange={(event) => time(event.currentTarget.value)} className="h-16 text-3xl tabular-nums" />
              <Input aria-label="Alarm label" placeholder="Label" maxLength={200} value={typed} disabled={busy(state)} onChange={(event) => label(event.currentTarget.value)} />
              {state.repeats ? (
                <div role="group" aria-label="Repeat" className="flex flex-wrap gap-2">
                  {week.map(({ day, short, name }) => (
                    <Chip key={day} aria-label={`Repeat on ${name}`} pressed={state.days.includes(day)} disabled={!can({ type: "toggleDay", day })} onPressedChange={() => void send({ type: "toggleDay", day })}>{short}</Chip>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
          {state.kind === "Snooze" ? (
            <label className="flex items-center gap-3">
              <Input type="number" aria-label="Snooze minutes" inputMode="numeric" min={1} max={60} value={snooze ?? String(state.snooze)} disabled={busy(state)} onChange={(event) => minutes(event.currentTarget.value)} className="w-24" />
              <span className="text-muted-foreground">min</span>
            </label>
          ) : null}
          {state.review.showing ? (
            <Card aria-label="Clock request">
              <p className="text-base">{reviewOf(state, typed)}</p>
              <CardFooter>
                <Button variant="ghost" onClick={() => void send({ type: "cancelReview" })} disabled={!can({ type: "cancelReview" })}>Cancel</Button>
                <Button onClick={() => void send({ type: "confirm" })} disabled={!can({ type: "confirm" })}>Open Clock</Button>
              </CardFooter>
            </Card>
          ) : (
            <Button loading={busy(state)} disabled={!can({ type: "prepare" })} onClick={() => void send({ type: "prepare" })}>Review</Button>
          )}
        </>
      )}
    </section>
  );
}
