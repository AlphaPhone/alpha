// spec/app/workflows/builder.md, "Story: Write a workflow step by step"; spec/app/workflows/builder.md, "Story: Save a workflow on the agent once"; spec/app/workflows/generate.md, "Story: Have the agent draft a workflow"
import { Alert, Button, ConfirmDialog, Input, ListRow, Select, SelectContent, SelectItem, SelectTrigger, Sheet, SheetContent, Spinner, Textarea } from "@repo/ui";
import { ChevronRight, Plus, Sparkles, Workflow } from "lucide-react";
import { useState } from "react";
import type { Machine as BuilderMachine } from "../../gen/app__workflows__builder.effect.vibe";
import { useMachine as useBuilder } from "../../gen/app__workflows__builder.react.ts";
import { type Event, maxName, unlocked } from "../../gen/app__workflows__builder.ts";
import type { Machine as GenerateMachine } from "../../gen/app__workflows__generate.effect.vibe";
import { useMachine as useGenerate } from "../../gen/app__workflows__generate.react.ts";
import { maxDescription } from "../../gen/app__workflows__generate.ts";
import type { Preset } from "../../gen/app__workflows__schedule.ts";
import type { Resident, Shown } from "../runtime/area.tsx";
import { type DraftOperation, DraftWords, appendDraft, available, describeDraft, discardDraft, removeDraftStep, renameDraft, useDraft } from "./authoring.vibe";

interface AuthoringProps extends Pick<Shown<Resident | BuilderMachine | GenerateMachine | DraftWords>, "runtime"> {
  readonly owner: number;
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

function StepInput({ options, prior, onAdd }: {
  options: readonly DraftOperation[];
  prior: readonly { id: number }[];
  onAdd: (operation: DraftOperation, source: number, text: string, suffix: string) => void;
}) {
  const [operation, setOperation] = useState<DraftOperation>("supplied_text");
  const [source, setSource] = useState(0);
  const [text, setText] = useState("");
  const [suffix, setSuffix] = useState("");
  const selected = options.find((item) => item === operation) ?? options[0];
  if (selected === undefined) return null;
  const from = prior.find((step) => step.id === source) ?? prior.at(-1);
  const first = selected === "supplied_text";
  return (
    <form className="flex flex-col gap-3" onSubmit={(event) => {
      event.preventDefault();
      onAdd(selected, first ? 0 : from?.id ?? 0, text, suffix);
      setText("");
      setSuffix("");
    }}>
      <label className="grid gap-1 text-sm">Step
        <Select value={selected} onValueChange={(value) => {
          const chosen = options.find((item) => item === value);
          if (chosen) setOperation(chosen);
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
      <label className="grid gap-1 text-sm">{selected === "compose_draft" ? "Prefix" : selected === "model_draft" ? "Instructions" : "Text"}
        <Textarea value={text} maxLength={4000} onChange={(event) => setText(event.currentTarget.value)} />
      </label>
      {selected === "compose_draft" && <label className="grid gap-1 text-sm">Suffix
        <Input value={suffix} maxLength={Math.max(0, 4000 - text.length)} onChange={(event) => setSuffix(event.currentTarget.value)} />
      </label>}
      <Button type="submit" variant="secondary" disabled={(text.trim() === "" && selected !== "compose_draft") || (!first && from === undefined)}>
        <Plus aria-hidden />Add step
      </Button>
    </form>
  );
}

/** Create a typed workflow, set when it runs, and review exactly what the agent will save. */
export function Authoring({ runtime, owner }: AuthoringProps) {
  const builder = useBuilder(runtime);
  const generate = useGenerate(runtime);
  const [prompt, setPrompt] = useState("");
  const state = builder.state;
  const model = generate.state;
  if (!state || state.owner !== owner) return <Spinner aria-label="Opening Workflows" />;
  const draft = runtime.runSync(DraftWords.use((words) => words.view()));
  const open = { type: "openBuilder", workflow: 0, version: 0, unfinished: false } as const;
  const tell = (event: Event) => { if (builder.can(event)) void builder.send(event); };
  if (!state.open) return (
    <ul className="divide-y divide-border">
      {builder.can(open) && <li><ListRow title="Workflow" leading={<Workflow />} trailing={<ChevronRight aria-hidden />} onClick={() => tell(open)} /></li>}
    </ul>
  );
  const editable = unlocked(state);
  const describe = { type: "describe", unlocked: editable, generates: state.generates } as const;
  const review = { type: "reviewSave", unfinished: false } as const;
  const confirm: Event = state.save.offered ? { type: "confirmResend" } : { type: "confirmSave", unfinished: false };
  const clock = `${String(state.when.hour).padStart(2, "0")}:${String(state.when.minute).padStart(2, "0")}`;
  const options = draft.catalog ? available(draft.catalog).filter((one) => state.steps.length > 0 || one === "supplied_text") : [];
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
      {editable && <StepInput options={options} prior={state.steps}
        onAdd={(operation, source, text, suffix) => void runtime.runPromiseExit(appendDraft(operation, source, text, suffix))} />}
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
            <Button disabled={!generate.can({ type: "useGenerated", edits: state.draft.edits })} onClick={() => void runtime.runPromiseExit(useDraft())}>Use draft</Button>
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
