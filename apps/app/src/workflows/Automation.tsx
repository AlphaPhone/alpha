// spec/app/workflows/automations.md, "Story: Act on an automation"; spec/app/workflows/automations.md, "Story: Create or edit an automation on a schedule"
import { Effect } from "effect";
import { Alert, Button, ConfirmDialog, Input, ListRow, Switch, Textarea } from "@repo/ui";
import { ChevronRight, Repeat } from "lucide-react";
import { useState } from "react";
import { type Event, type Change, maxText } from "../../gen/app__workflows__automations.ts";
import { useMachine } from "../../gen/app__workflows__automations.react.ts";
import type { Machine } from "../../gen/app__workflows__automations.effect.vibe";
import type { Preset } from "../../gen/app__workflows__schedule.ts";
import type { Resident, Shown } from "../runtime/area.tsx";
import { AutomationWords, editAutomation, reviewAutomation, rowOffers } from "./automations.vibe";
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

function EditFields({ initial, onReview }: { initial: { title: string; text: string }; onReview: (title: string, instructions: string) => void }) {
  const [title, setTitle] = useState(initial.title);
  const [instructions, setInstructions] = useState(initial.text);
  return <form className="flex flex-col gap-3" onSubmit={(event) => {
    event.preventDefault();
    onReview(title, instructions);
  }}>
    <label className="grid gap-1 text-sm">Name
      <Input value={title} maxLength={80} required onChange={(event) => setTitle(event.currentTarget.value)} />
    </label>
    <label className="grid gap-1 text-sm">Instructions
      <Textarea value={instructions} maxLength={maxText} required onChange={(event) => setInstructions(event.currentTarget.value)} />
    </label>
    <Button type="submit" disabled={title.trim() === "" || instructions.trim() === ""}>Review</Button>
  </form>;
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
  const state = model.state;
  const number = row?.number ?? 0;
  if (!state || state.owner !== owner || state.row !== number) return null;
  const editor = () => void runtime.runPromiseExit(editAutomation(owner, number));
  const send = (event: Event) => { if (model.can(event)) void model.send(event); };
  const draft = runtime.runSync(Effect.flatMap(AutomationWords, (content) => content.view()));
  const editing = state.editing && draft.owner === owner && draft.row === number;
  const toggle = state.on ? "Disable" : "Enable";
  const canEdit = row?.kind === "Prompt" && model.can({ type: "editRow", chars: row.summary.length, hour: 8, minute: 0, zone: 0, workflow: 0 });
  const time = `${String(state.when.hour).padStart(2, "0")}:${String(state.when.minute).padStart(2, "0")}`;
  return (
    <section aria-label={row === undefined ? "Automation" : "Automation controls"} className="flex flex-col gap-3">
      {row === undefined && !editing && model.can({ type: "openEditor", kind: "PromptTask", zone: 0 }) && (
        <ListRow title="Automation" leading={<Repeat />} trailing={<ChevronRight aria-hidden />} onClick={editor} />
      )}
      {row?.kind === "Prompt" && model.can(eventFor(toggle)) && (
        <label className="flex items-center justify-between gap-3">
          <span>{state.on ? "On" : "Off"}</span>
          <Switch checked={state.on} aria-label={`Turn ${row.title} on or off`} onCheckedChange={() => send(eventFor(toggle))} />
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
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm">When</legend>
          <div className="flex flex-wrap gap-1">
            {schedules.map(([preset, label]) => <Button key={preset} size="sm" aria-pressed={state.when.preset === preset}
              variant={state.when.preset === preset ? "primary" : "secondary"} onClick={() => send({ type: "pickPreset", preset })}>{label}</Button>)}
          </div>
          {state.when.preset === "Custom" && <div className="flex flex-wrap gap-1">
            {weekdays.map((day, index) => <Button key={day} size="sm" aria-label={day} aria-pressed={state.when.days.includes(index)}
              variant={state.when.days.includes(index) ? "primary" : "secondary"} onClick={() => send({ type: "toggleDay", day: index })}>{day.slice(0, 3)}</Button>)}
          </div>}
          <label className="grid gap-1 text-sm">Time in {draft.zone}
            <Input type="time" value={time} onChange={(event) => {
              const [hour, minute] = event.currentTarget.value.split(":").map(Number);
              if (hour !== undefined && minute !== undefined) send({ type: "setTime", hour, minute });
            }} />
          </label>
        </fieldset>
        <EditFields key={number} initial={draft} onReview={(title, instructions) => void runtime.runPromiseExit(reviewAutomation(title, instructions))} />
        <Button variant="ghost" onClick={() => send({ type: "closeEditor" })}>Cancel</Button>
      </>}
      {state.fired === "Dispatched" && <p role="status">The agent ran it.</p>}
      {state.fired === "Deferred" && <p role="status">The agent scheduled another attempt.</p>}
      {state.fired === "Raced" && <p role="status">Another run started first.</p>}
      {state.fired === "SkippedRun" && <p role="status">The agent skipped the run.</p>}
      {state.fired === "DispatchFailed" && <Alert variant="warn">The agent couldn’t run it.</Alert>}
      {state.change.live && <p role="status">Waiting for the agent…</p>}
      {model.can({ type: "checkChange" }) && <Alert variant="warn" role="status">The agent didn’t confirm the change.
        <Button size="sm" variant="secondary" onClick={() => send({ type: "readAutomations" })}>Refresh</Button>
      </Alert>}
      {state.change.attempt.outcome === "Refused" && state.fired === "NotFired" && <Alert variant="warn">The agent didn’t apply the change.</Alert>}
      <ConfirmDialog open={state.review.showing} title={`${reviewLabel(state.proposed)} “${row?.title ?? draft.title}”?`}
        confirmLabel={reviewLabel(state.proposed)} destructive={state.proposed === "Remove"}
        onConfirm={() => send({ type: "confirmChange" })} onCancel={() => send({ type: "cancelReview" })}>
        {state.proposed === "Create" || state.proposed === "Edit" ? `${draft.text} · ${time} in ${draft.zone}` : undefined}
      </ConfirmDialog>
    </section>
  );
}
