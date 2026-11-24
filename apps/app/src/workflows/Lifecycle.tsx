// spec/app/workflows/index.md, "Story: Change a workflow"
import { Alert, Button, ConfirmDialog, Input, Switch } from "@repo/ui";
import { useState } from "react";
import { useMachine } from "../../gen/app__workflows.react.ts";
import { type Change, type Event } from "../../gen/app__workflows.ts";
import type { Machine } from "../../gen/app__workflows.effect.vibe";
import type { Resident, Shown } from "../runtime/area.tsx";
import { DefinitionWords, reviewName } from "./lifecycle.vibe";

interface LifecycleProps extends Pick<Shown<Resident | Machine | DefinitionWords>, "runtime"> {
  readonly row: number;
  readonly owner: number;
  readonly title: string;
  readonly unfinished: boolean;
  readonly interrupted: boolean;
}

const labels = { TurnOn: "Turn on", TurnOff: "Turn off", Rename: "Rename", Remove: "Remove", Restore: "Restore" } satisfies Record<Change, string>;

function reviewCopy(change: Change, outcomeUnknown: boolean, name: string) {
  switch (change) {
    case "TurnOn": return "This schedule runs while this phone and its agent are on. Android can delay a run.";
    case "Rename": return `The workflow will be named “${name}”.`;
    case "Remove": return outcomeUnknown
      ? "A run was interrupted and its outcome is unknown. Removing keeps its history."
      : "The schedule stops and the run history is kept.";
    case "Restore": return "The workflow comes back turned off, with its old schedule retired.";
    case "TurnOff": return "The schedule stops.";
  }
}

/** Workflow changes at the exact version the owner read, with confirmations before reviewed changes. */
export function Lifecycle({ runtime, row, owner, title, unfinished, interrupted }: LifecycleProps) {
  const model = useMachine(runtime);
  const state = model.state;
  const [name, setName] = useState<string>();
  if (state === undefined || state.owner !== owner || state.target !== row || !state.open) return null;
  const send = (event: Event) => { if (model.can(event)) void model.send(event); };
  const request = (wanted: Change): Event => ({ type: "reviewChange", wanted, unfinished, interrupted });
  const flip: Event = { type: "flip", wanted: state.active ? "TurnOff" : "TurnOn" };
  const power = state.scheduled && !state.active ? request("TurnOn") : flip;
  const confirmation: Event = { type: "confirmChange", unfinished };
  const reviewNameText = state.review.showing && state.proposed === "Rename"
    ? runtime.runSync(DefinitionWords.use((definition) => definition.name(row)))
    : "";
  return (
    <section aria-label="Workflow controls" className="flex flex-col gap-3">
      {state.detail.status === "Failed" && (
        <Alert role="status" variant="warn">The workflow couldn’t be opened.
          <Button variant="secondary" size="sm" onClick={() => send({ type: "readWorkflow" })}>Retry</Button>
        </Alert>
      )}
      {state.detail.status === "Loaded" && !state.removed && (
        <label className="flex items-center justify-between gap-2">
          <span>{state.active ? "On" : "Off"}</span>
          <Switch aria-label={`Turn ${title} on or off`} checked={state.active} disabled={!model.can(power)}
            onCheckedChange={() => send(power)} />
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {model.can({ type: "editName", chars: state.renaming === 1 ? 0 : 1 }) && name === undefined && (
          <Button variant="secondary" onClick={() => setName(title)}>Rename</Button>
        )}
        {model.can(request("Remove")) && <Button variant="secondary" onClick={() => send(request("Remove"))}>Remove</Button>}
        {model.can(request("Restore")) && <Button variant="secondary" onClick={() => send(request("Restore"))}>Restore</Button>}
      </div>
      {name !== undefined && (
        <form className="flex flex-col gap-2" onSubmit={(event) => {
          event.preventDefault();
          void runtime.runPromiseExit(reviewName(row, name, unfinished, interrupted));
          setName(undefined);
        }}>
          <label className="text-sm" htmlFor="workflow-rename">Name</label>
          <Input id="workflow-rename" value={name} required maxLength={80} onChange={(event) => setName(event.currentTarget.value)} />
          <div className="flex gap-2">
            <Button type="submit" disabled={name.trim() === ""}>Review</Button>
            <Button variant="secondary" onClick={() => setName(undefined)}>Cancel</Button>
          </div>
        </form>
      )}
      {state.change.live && <p role="status" className="text-sm text-muted-foreground">Waiting for your agent…</p>}
      {model.can({ type: "checkChange" }) && (
        <Alert role="status" variant="warn">Your agent didn’t confirm the change.
          <Button variant="secondary" size="sm" onClick={() => send({ type: "checkChange" })}>Check change</Button>
        </Alert>
      )}
      {model.can({ type: "letGo" }) && (
        <Button variant="secondary" onClick={() => send({ type: "letGo" })}>Allow a different change</Button>
      )}
      {state.change.attempt.outcome === "Refused" && !state.change.offered && (
        <p role="status" className="text-sm text-muted-foreground">Your agent didn’t apply the change.</p>
      )}
      <ConfirmDialog open={state.review.showing} title={`${labels[state.proposed]} “${title}”?`}
        confirmLabel={labels[state.proposed]} destructive={state.proposed === "Remove"}
        onConfirm={() => send(confirmation)} onCancel={() => send({ type: "cancelReview" })}>
        {reviewCopy(state.proposed, state.unknownShown, reviewNameText)}
      </ConfirmDialog>
    </section>
  );
}
