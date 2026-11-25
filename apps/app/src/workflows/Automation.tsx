// spec/app/workflows/automations.md, "Story: Act on an automation"; spec/app/workflows/automations.md, "Story: Create or edit an automation on a schedule"
import { Alert, Button, ConfirmDialog, Input, ListRow, Switch, Textarea } from "@repo/ui";
import { ChevronRight, Clock } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { type Event, type Change, maxText } from "../../gen/app__workflows__automations.ts";
import { useMachine } from "../../gen/app__workflows__automations.react.ts";
import type { Machine } from "../../gen/app__workflows__automations.effect.vibe";
import type { Preset, When } from "../../gen/app__workflows__schedule.ts";
import type { Resident, Shown } from "../runtime/area.tsx";
import { AutomationWords, editAutomation, promptEditEvent, reviewAutomation, rowOffers } from "./automations.vibe";
import type { Prompt } from "./api.vibe";
import type { WorkflowRow } from "./list.vibe";

interface AutomationProps extends Pick<Shown<Resident | Machine | AutomationWords>, "runtime"> {
  readonly row?: WorkflowRow;
  readonly owner: number;
}

const actions = [
  ["Fire", "Run now"], ["Snooze", "Snooze 10 minutes"], ["Complete", "Mark done"], ["Dismiss", "Dismiss"],
  ["Skip", "Skip"], ["Reopen", "Reopen"], ["Remove", "Remove"],
] as const satisfies readonly (readonly [Change, string])[];
const schedules = [["Daily", "Every day"], ["Weekdays", "Weekdays"], ["Weekends", "Weekends"], ["Custom", "Custom"]] as const satisfies readonly (readonly [Preset, string])[];
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function EditFields({ initial, canReview, onReview }: { initial: { title: string; text: string }; canReview: boolean; onReview: (title: string, instructions: string) => void }) {
  const [title, setTitle] = useState(initial.title);
  const [instructions, setInstructions] = useState(initial.text);
  return <form className="flex flex-col gap-3" onSubmit={(event) => {
    event.preventDefault();
    if (canReview) onReview(title, instructions);
  }}>
    <label className="grid gap-1 text-sm">Name
      <Input aria-label="Name" value={title} maxLength={80} required onChange={(event) => setTitle(event.currentTarget.value)} />
    </label>
    <label className="grid gap-1 text-sm">Instructions
      <Textarea aria-label="Instructions" value={instructions} maxLength={maxText} required onChange={(event) => setInstructions(event.currentTarget.value)} />
    </label>
    <Button type="submit" disabled={!canReview || title.trim() === "" || instructions.trim() === ""}>Review</Button>
  </form>;
}

function savedSchedule(prompt: Prompt): string {
  switch (prompt.triggerType) {
    case "once": return `Once at ${prompt.scheduledAtIso} · ${prompt.timezone}`;
    case "event": return `On ${prompt.eventKind} · ${prompt.timezone}`;
    case "cron": return `Cron ${prompt.cronExpression} · ${prompt.timezone}`;
  }
}

function editedSchedule(when: When, time: string, zone: string): string {
  const days = when.preset === "Custom"
    ? weekdays.filter((_, index) => when.days.includes(index)).join(", ")
    : schedules.find(([preset]) => preset === when.preset)?.[1];
  return [days, `${time} in ${zone}`].filter(Boolean).join(" · ");
}

function eventFor(wanted: Change): Event {
  return wanted === "Fire" || wanted === "Remove"
    ? { type: "reviewChange", wanted }
    : { type: "act", wanted, minutes: wanted === "Snooze" ? 10 : 0 };
}

function reviewLabel(action: Change): string {
  return actions.find(([kind]) => kind === action)?.[1] ?? (action === "Edit" ? "Save changes" : "Save automation");
}

/** Prompt and scheduled-task controls over the current owner and row. */
export function Automation({ runtime, row, owner }: AutomationProps) {
  const model = useMachine(runtime);
  const wordsService = runtime.runSync(AutomationWords);
  const snapshot = useSyncExternalStore(wordsService.subscribe, wordsService.snapshot, wordsService.snapshot);
  const state = model.state;
  const number = row?.number ?? 0;
  if (!state || state.owner !== owner || state.row !== number) return null;
  const editor = () => void runtime.runPromiseExit(editAutomation(owner, number));
  const send = (event: Event) => { if (model.can(event)) void model.send(event); };
  const draft = snapshot.editor;
  const editing = state.editing && draft.owner === owner && draft.row === number;
  const toggle = state.on ? "Disable" : "Enable";
  const observed = row?.kind === "Prompt" && snapshot.observed?.owner === owner && snapshot.observed.row === number && snapshot.observed.ticket === state.list.ticket
    ? snapshot.observed.prompt
    : undefined;
  const canEdit = observed !== undefined && model.can(promptEditEvent(observed));
  const time = `${String(state.when.hour).padStart(2, "0")}:${String(state.when.minute).padStart(2, "0")}`;
  const schedule = draft.source.kind === "Existing" && !state.timingEditable
    ? savedSchedule(draft.source.prompt) : editedSchedule(state.when, time, draft.zone);
  const reviewEdit = state.proposed === "Edit" || state.proposed === "Create";
  const reviewedTitle = reviewEdit ? draft.title : row?.title ?? draft.title;
  const canSetCurrentTime = model.can({ type: "setTime", hour: state.when.hour, minute: state.when.minute });
  return (
    <section aria-label={row === undefined ? "Automation" : "Automation controls"} className="flex flex-col gap-3">
      {row === undefined && !editing && model.can({ type: "openEditor", kind: "PromptTask", zone: 0 }) && (
        <ListRow title="Automation" leading={<Clock />} trailing={<ChevronRight aria-hidden />} onClick={editor} />
      )}
      {row?.kind === "Prompt" && model.can(eventFor(toggle)) && (
        <label className="flex items-center justify-between gap-3">
          <span>{state.on ? "On" : "Off"}</span>
          <Switch checked={state.on} disabled={!model.can(eventFor(toggle))} aria-label={`Turn ${row.title} on or off`} onCheckedChange={() => send(eventFor(toggle))} />
        </label>
      )}
      {row !== undefined && !editing && (
        <div className="flex flex-wrap gap-2">
          {actions.map(([wanted, label]) => {
            const event = eventFor(wanted);
            return rowOffers(row, wanted) && model.can(event)
              ? <Button key={wanted} variant={wanted === "Fire" ? "primary" : "secondary"} onClick={() => send(event)}>{label}</Button>
              : null;
          })}
          {canEdit && <Button variant="secondary" onClick={editor}>Edit</Button>}
        </div>
      )}
      {editing && <>
        {state.timingEditable ? <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm">When</legend>
          <div className="flex flex-wrap gap-1">
            {schedules.map(([preset, label]) => {
              const pick = { type: "pickPreset", preset } as const;
              return <Button key={preset} size="sm" aria-pressed={state.when.preset === preset}
                disabled={state.when.preset !== preset && !model.can(pick)}
                variant={state.when.preset === preset ? "primary" : "secondary"} onClick={() => send(pick)}>{label}</Button>;
            })}
          </div>
          {state.when.preset === "Custom" && <div className="flex flex-wrap gap-1">
            {weekdays.map((day, index) => {
              const toggleDay = { type: "toggleDay", day: index } as const;
              return <Button key={day} size="sm" aria-label={day} aria-pressed={state.when.days.includes(index)}
                disabled={!model.can(toggleDay)}
                variant={state.when.days.includes(index) ? "primary" : "secondary"} onClick={() => send(toggleDay)}>{day.slice(0, 3)}</Button>;
            })}
          </div>}
          <label className="grid gap-1 text-sm">Time in {draft.zone}
            <Input type="time" value={time} disabled={!canSetCurrentTime} onChange={(event) => {
              const [hour, minute] = event.currentTarget.value.split(":").map(Number);
              if (hour !== undefined && minute !== undefined) send({ type: "setTime", hour, minute });
            }} />
          </label>
        </fieldset> : <p className="text-sm text-muted-foreground">{schedule}</p>}
        <EditFields key={number} initial={draft} canReview={model.can({ type: "setText", chars: 1 })}
          onReview={(title, instructions) => void runtime.runPromiseExit(reviewAutomation(title, instructions))} />
        <Button variant="ghost" disabled={!model.can({ type: "closeEditor" })} onClick={() => send({ type: "closeEditor" })}>Cancel</Button>
      </>}
      {state.fired === "Dispatched" && <p role="status">The agent ran it.</p>}
      {state.fired === "Deferred" && <p role="status">The agent scheduled another attempt.</p>}
      {state.fired === "Raced" && <p role="status">Another run started first.</p>}
      {state.fired === "SkippedRun" && <p role="status">The agent skipped the run.</p>}
      {state.fired === "DispatchFailed" && <Alert variant="warn">The agent couldn’t run it.</Alert>}
      {state.change.live && <p role="status">Waiting for the agent…</p>}
      {model.can({ type: "checkChange" }) && <Alert variant="warn" role="status">The agent didn’t confirm the change.
        <Button size="sm" variant="secondary" onClick={() => send({ type: "checkChange" })}>Check change</Button>
      </Alert>}
      {model.can({ type: "resendChange" }) && (
        <Button variant="secondary" onClick={() => send({ type: "resendChange" })}>Send again</Button>
      )}
      {model.can({ type: "letGo" }) && (
        <Button variant="secondary" onClick={() => send({ type: "letGo" })}>Allow a different change</Button>
      )}
      {model.can({ type: "dismissRecovery" }) && (
        <Button variant="ghost" onClick={() => send({ type: "dismissRecovery" })}>Dismiss notice</Button>
      )}
      {state.change.attempt.outcome === "Refused" && state.fired === "NotFired" && <Alert variant="warn">The agent didn’t apply the change.</Alert>}
      <ConfirmDialog open={state.review.showing} title={`${reviewLabel(state.proposed)} “${reviewedTitle}”?`}
        confirmLabel={reviewLabel(state.proposed)} destructive={state.proposed === "Remove"}
        onConfirm={() => send({ type: "confirmChange" })} onCancel={() => send({ type: "cancelReview" })}>
        {reviewEdit ? `${draft.text} · ${schedule}` : undefined}
      </ConfirmDialog>
    </section>
  );
}
