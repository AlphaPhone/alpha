// spec/app/workflows/builder.md, "Story: Write a workflow step by step"; spec/app/workflows/builder.md, "Story: Save a workflow on the agent once"; spec/app/workflows/generate.md, "Story: Have the agent draft a workflow"
import { Effect } from "effect";
import { Alert, Button, ConfirmDialog, Input, Select, SelectContent, SelectItem, SelectTrigger, Sheet, SheetContent, Spinner, Textarea, WorkflowChoice } from "@repo/ui";
import { ListChecks, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import type { Machine as BuilderMachine } from "../../gen/app__workflows__builder.effect.vibe";
import { useMachine as useBuilder } from "../../gen/app__workflows__builder.react.ts";
import { type Event, maxName, unlocked } from "../../gen/app__workflows__builder.ts";
import type { Machine as GenerateMachine } from "../../gen/app__workflows__generate.effect.vibe";
import { useMachine as useGenerate } from "../../gen/app__workflows__generate.react.ts";
import { maxDescription } from "../../gen/app__workflows__generate.ts";
import type { Preset } from "../../gen/app__workflows__schedule.ts";
import type { Resident, Shown } from "../runtime/area.tsx";
import { type DraftOperation, DraftWords, appendDraft, available, describeDraft, discardDraft, removeDraftStep, renameDraft, adoptGeneratedDraft } from "./authoring.vibe";

interface AuthoringProps extends Pick<Shown<Resident | BuilderMachine | GenerateMachine | DraftWords>, "runtime"> {
  readonly owner: number;
  /** Whether Add to Workflows shows its further choices, where a workflow of steps is one. */
  readonly offered?: boolean;
}

const titles: Readonly<Record<string, string>> = {
  supplied_text: "Supplied text", selected_notes: "Selected notes", selected_reminders: "Reminders", calendar_range: "Calendar",
  contains: "Check for text", compose_draft: "Compose text", model_draft: "Draft with Alpha", save_note: "Save a note",
  app_notification: "Notify me", read_aloud: "Read aloud",
};
const presets: readonly { key: Preset; label: string }[] = [
  { key: "Manual", label: "Manual" }, { key: "Daily", label: "Every day" }, { key: "Weekdays", label: "Weekdays" },
  { key: "Weekends", label: "Weekends" }, { key: "Custom", label: "Custom" },
];
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function StepInput({ options, prior, notes, calendars, list, calendarAccess, openSettings, loading, failed, zone, runDay, onAdd }: {
  options: readonly DraftOperation[];
  prior: readonly { id: number }[];
  notes: readonly { id: string; title: string }[] | undefined;
  calendars: readonly { id: string; title: string }[] | undefined;
  list: (operation: "SelectedNotes" | "CalendarRange") => void;
  calendarAccess: boolean;
  openSettings: (() => void) | undefined;
  loading: boolean;
  failed: boolean;
  zone: string;
  runDay: boolean;
  onAdd: (operation: DraftOperation, source: number, text: string, suffix: string, selected: readonly string[], runDays?: number) => Promise<boolean>;
}) {
  const [operation, setOperation] = useState<DraftOperation>("supplied_text");
  const [source, setSource] = useState(0);
  const [text, setText] = useState("");
  const [suffix, setSuffix] = useState("");
  const [choices, setChoices] = useState<readonly string[]>([]);
  const [rejected, setRejected] = useState(false);
  const [relative, setRelative] = useState(false);
  const [days, setDays] = useState("1");
  const selected = options.find((item) => item === operation) ?? options[0];
  if (selected === undefined) return null;
  const from = prior.find((step) => step.id === source) ?? prior.at(-1);
  const first = selected === "supplied_text" || selected === "selected_notes" || selected === "selected_reminders" || selected === "calendar_range";
  const asksForNoText = selected === "selected_reminders" || selected === "read_aloud";
  const resources = selected === "selected_notes" || selected === "calendar_range";
  const calendar = selected === "calendar_range";
  const rows = calendar ? calendars : notes;
  const useRunDay = calendar && runDay && relative;
  const dayCount = /^[1-7]$/.test(days) ? Number(days) : undefined;
  const missing = resources ? choices.length === 0 || (calendar && (useRunDay ? dayCount === undefined : !text || !suffix || suffix <= text))
    : !asksForNoText && text.trim() === "" && selected !== "compose_draft";
  return (
    <form className="flex flex-col gap-3" onSubmit={(event) => {
      event.preventDefault();
      void onAdd(selected, first ? 0 : from?.id ?? 0, text, suffix, choices, useRunDay ? dayCount : undefined).then((added) => {
        setRejected(!added);
        if (!added) return;
        setText("");
        setSuffix("");
        setChoices([]);
      });
    }}>
      <label className="grid gap-1 text-sm">Step
        <Select value={selected} onValueChange={(value) => {
          const chosen = options.find((item) => item === value);
          if (chosen === undefined || chosen === selected) return;
          setOperation(chosen);
          setRejected(false);
          setText("");
          setSuffix("");
          setChoices([]);
        }}>
          <SelectTrigger aria-label="Step" />
          <SelectContent>{options.map((item) => <SelectItem key={item} value={item}>{titles[item]}</SelectItem>)}</SelectContent>
        </Select>
      </label>
      {!first && <label className="grid gap-1 text-sm">Input from
        <Select value={String(from?.id ?? "")} onValueChange={(id) => setSource(Number(id))}>
          <SelectTrigger aria-label="Input from" />
          <SelectContent>{prior.map((step, index) => <SelectItem key={step.id} value={String(step.id)}>Step {index + 1}</SelectItem>)}</SelectContent>
        </Select>
      </label>}
      {resources ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">{calendar ? "Calendars" : "Notes"}</legend>
          {calendar && openSettings ? <Button type="button" variant="secondary" onClick={openSettings}>Open Android permissions</Button> : (
            <Button type="button" variant="secondary" disabled={loading} onClick={() => list(calendar ? "CalendarRange" : "SelectedNotes")}>
              {calendar ? (calendarAccess ? "Show calendars" : "Allow calendar access") : "Show notes"}
            </Button>
          )}
          {loading && <Spinner aria-label="Reading sources" />}
          {failed && <Alert variant="warn" role="status">Sources couldn’t be read.</Alert>}
          {rows?.length === 0 && <p className="text-sm text-muted-foreground">{calendar ? "No calendars found" : "No saved notes"}</p>}
          {rows && <div className="max-h-48 overflow-auto">
            {rows.map(({ id, title }) => <label key={id} className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" checked={choices.includes(id)} disabled={choices.length >= 16 && !choices.includes(id)}
                onChange={(event) => setChoices(event.currentTarget.checked ? [...choices, id] : choices.filter((one) => one !== id))} />
              {title || (calendar ? "Unnamed calendar" : "Untitled note")}
            </label>)}
          </div>}
          {calendar && rows && (
            <div className="grid grid-cols-2 gap-2">
              {runDay && <label className="col-span-2 grid gap-1 text-sm">Date range
                <Select value={useRunDay ? "relative" : "fixed"} onValueChange={(value) => setRelative(value === "relative")}>
                  <SelectTrigger aria-label="Date range" />
                  <SelectContent><SelectItem value="fixed">Fixed dates</SelectItem><SelectItem value="relative">From the run day</SelectItem></SelectContent>
                </Select>
              </label>}
              {useRunDay ? <label className="col-span-2 grid gap-1 text-sm">Days
                <Input type="number" min={1} max={7} step={1} value={days} onChange={(event) => setDays(event.currentTarget.value)} />
              </label> : <>
                <label className="grid gap-1 text-sm">From<Input type="date" value={text} onChange={(event) => setText(event.currentTarget.value)} /></label>
                <label className="grid gap-1 text-sm">Until<Input type="date" value={suffix} onChange={(event) => setSuffix(event.currentTarget.value)} /></label>
              </>}
              <p className="col-span-2 text-sm text-muted-foreground">Up to seven days in {zone}.</p>
            </div>
          )}
        </fieldset>
      ) : asksForNoText ? (selected === "selected_reminders" && <p className="text-sm text-muted-foreground">Read up to 50 open reminders due by the end of the run day, and reminders completed that day.</p>)
        : <label className="grid gap-1 text-sm">{selected === "compose_draft" ? "Prefix" : selected === "model_draft" ? "Instructions" : selected === "save_note" ? "Note title" : selected === "app_notification" ? "Notification title" : "Text"}
          <Textarea value={text} maxLength={selected === "save_note" ? 256 : selected === "app_notification" ? 120 : 4000} onChange={(event) => setText(event.currentTarget.value)} />
        </label>}
      {selected === "compose_draft" && <label className="grid gap-1 text-sm">Suffix
        <Input value={suffix} maxLength={Math.max(0, 4000 - text.length)} onChange={(event) => setSuffix(event.currentTarget.value)} />
      </label>}
      {rejected && <Alert variant="warn" role="status">{calendar
        ? "Choose available calendars and a range of up to seven days."
        : "Check the step’s inputs and try again."}</Alert>}
      <Button type="submit" variant="secondary" disabled={missing || (!first && from === undefined)}>
        <Plus aria-hidden />Add step
      </Button>
    </form>
  );
}

/** Create a typed workflow, set when it runs, and review exactly what the agent will save. */
export function Authoring({ runtime, owner, offered = true }: AuthoringProps) {
  const builder = useBuilder(runtime);
  const generate = useGenerate(runtime);
  const [prompt, setPrompt] = useState("");
  const state = builder.state;
  const model = generate.state;
  if (!state || state.owner !== owner) return <Spinner aria-label="Opening Workflows" />;
  const draft = runtime.runSync(Effect.flatMap(DraftWords, (words) => words.view()));
  const open = { type: "openBuilder", workflow: 0, version: 0, unfinished: false } as const;
  const tell = (event: Event) => { if (builder.can(event)) void builder.send(event); };
  if (!state.open) return offered && builder.can(open) ? <WorkflowChoice label="Steps" icon={<ListChecks />} onClick={() => tell(open)} /> : null;
  const editable = unlocked(state);
  const describe = { type: "describe", unlocked: editable, generates: state.generates } as const;
  const review = { type: "reviewSave", unfinished: false } as const;
  const confirm: Event = state.save.offered ? { type: "confirmResend" } : { type: "confirmSave", unfinished: false };
  const clock = `${String(state.when.hour).padStart(2, "0")}:${String(state.when.minute).padStart(2, "0")}`;
  const options = draft.catalog ? available(draft.catalog, draft.device)
    .filter((one) => state.steps.length > 0 || one === "supplied_text" || one === "selected_notes" || one === "selected_reminders" || one === "calendar_range") : [];
  const choices = state.choices.status === "Loaded" ? draft.choices : undefined;
  const listSources = (op: "SelectedNotes" | "CalendarRange") => {
    const ask = { type: "askCalendarAccess" } as const;
    if (op === "CalendarRange" && builder.can(ask)) tell(ask);
    else tell({ type: "listChoices", op });
  };
  return (
    <section className="flex flex-col gap-4">
      {state.offer.status === "Loading" && <Spinner aria-label="Reading available steps" />}
      {state.offer.status === "Failed" && <Alert variant="warn" role="status">The agent’s workflow options couldn’t be read.</Alert>}
      {state.save.attempt.outcome === "Confirmed" && state.steps.length === 0 && state.name === 0 && <Alert role="status">Workflow saved.</Alert>}
      <label className="grid gap-1 text-sm">Name
        <Input disabled={!editable} value={draft.name} maxLength={maxName} onChange={(event) => void runtime.runPromiseExit(renameDraft(event.currentTarget.value))} />
      </label>
      <ol aria-label="Workflow steps" className="divide-y divide-border">
        {draft.steps.map((step) => <li key={step.id} className="py-2">{titles[step.operation]}</li>)}
      </ol>
      {editable && <StepInput options={options} prior={state.steps} zone={draft.zone} runDay={state.catalog.runDay} list={listSources}
        notes={choices?.tag === "SelectedNotes" ? choices.rows : undefined}
        calendars={choices?.tag === "CalendarRange" ? choices.rows : undefined}
        calendarAccess={state.access.grant === "Granted" || state.access.grant === "Limited"}
        openSettings={builder.can({ type: "openSettings" }) ? () => tell({ type: "openSettings" }) : undefined}
        loading={state.choices.status === "Loading"} failed={state.choices.status === "Failed"}
        onAdd={(operation, source, text, suffix, selected, days) => runtime.runPromise(appendDraft(operation, source, text, suffix, selected, days)).catch(() => false)} />}
      {builder.can({ type: "removeStep" }) && <Button variant="ghost" onClick={() => void runtime.runPromiseExit(removeDraftStep())}>Remove last step</Button>}
      {generate.can(describe) && <Button variant="secondary" onClick={() => void generate.send(describe)}><Sparkles aria-hidden />Describe to Alpha</Button>}
      {state.schedules && <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm text-muted-foreground">When</legend>
        <div className="flex flex-wrap gap-2">
          {presets.map(({ key, label }) => {
            const event = { type: "setPreset", preset: key } as const;
            return <Button key={key} size="sm" variant={state.when.preset === key ? "primary" : "secondary"} aria-pressed={state.when.preset === key}
              disabled={!editable} onClick={() => tell(event)}>{label}</Button>;
          })}
        </div>
        {state.when.preset === "Custom" && <div className="flex flex-wrap gap-1">
          {weekdays.map((day, index) => <Button key={day} size="sm" variant={state.when.days.includes(index) ? "primary" : "secondary"}
            aria-label={day} aria-pressed={state.when.days.includes(index)} disabled={!editable}
            onClick={() => tell({ type: "toggleDay", day: index })}>{day.slice(0, 3)}</Button>)}
        </div>}
        {state.when.preset !== "Manual" && <label className="grid gap-1 text-sm">Time in {draft.zone}
          <Input type="time" value={clock} disabled={!editable} onChange={(event) => {
            const [hour, minute] = event.currentTarget.value.split(":").map(Number);
            if (hour !== undefined && minute !== undefined) tell({ type: "setTime", hour, minute });
          }} />
        </label>}
      </fieldset>}
      <div className="flex flex-wrap gap-2">
        {builder.can(review) && draft.name.trim() !== "" && <Button onClick={() => tell(review)}>Review workflow</Button>}
        {builder.can({ type: "discard" }) && <Button variant="ghost" onClick={() => void runtime.runPromiseExit(discardDraft())}>
          {state.discarding ? "Confirm discard" : "Discard draft"}
        </Button>}
        {state.unwritable && builder.can({ type: "keepDraft" }) && <Button variant="secondary" onClick={() => tell({ type: "keepDraft" })}>Retry keeping draft</Button>}
      </div>
      {state.save.live && <Spinner aria-label="Saving workflow" />}
      {builder.can({ type: "checkSave" }) && <Alert variant="warn" role="status">
        The agent didn’t confirm the save.
        <Button variant="secondary" onClick={() => tell({ type: "checkSave" })}>Check save</Button>
      </Alert>}
      {builder.can({ type: "reviewResend" }) && <Button variant="secondary" onClick={() => tell({ type: "reviewResend" })}>Review the same save</Button>}
      {state.save.attempt.outcome === "Refused" && !state.save.offered && <Alert variant="warn" role="status">Your agent didn’t save this workflow.</Alert>}
      <ConfirmDialog open={state.review.showing} title={`Save “${draft.name.trim()}”?`}
        confirmLabel={state.save.offered ? "Send again" : "Save workflow"} onConfirm={() => tell(confirm)} onCancel={() => tell({ type: "cancelSave" })}>
        {state.when.preset === "Manual" ? "Runs only when you start it." : `Scheduled at ${clock} in ${draft.zone}. Your phone must stay on.`} It starts turned off.
      </ConfirmDialog>
      <Sheet open={model?.describing ?? false} onOpenChange={(open) => { if (!open && generate.can({ type: "cancelGeneration" })) void generate.send({ type: "cancelGeneration" }); }}>
        <SheetContent title="Describe a workflow" actions={model?.drafted.length ? (
          <>
            <Button variant="secondary" onClick={() => void generate.send({ type: "discardGenerated" })}>Discard</Button>
            <Button disabled={!generate.can({ type: "useGenerated", edits: state.draft.edits })} onClick={() => void runtime.runPromiseExit(adoptGeneratedDraft())}>Use draft</Button>
          </>
        ) : (
          <Button disabled={prompt.trim() === "" || model?.generation.status === "Loading"} onClick={() => void runtime.runPromiseExit(describeDraft(prompt))}>Draft workflow</Button>
        )}>
          <div className="flex flex-col gap-3 py-2">
            <label className="grid gap-1 text-sm">What should it do?
              <Textarea value={prompt} maxLength={maxDescription} onChange={(event) => setPrompt(event.currentTarget.value)} />
            </label>
            {model?.generation.status === "Loading" && <Spinner aria-label="Drafting workflow" />}
            {model?.generation.status === "Failed" && <Alert variant="warn" role="status">The agent couldn’t draft that workflow.</Alert>}
            {model?.drafted.length ? <ol className="list-inside list-decimal">
              {draft.generated?.steps.map((step) => <li key={step.id}>{titles[step.operation]}</li>)}
            </ol> : null}
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
