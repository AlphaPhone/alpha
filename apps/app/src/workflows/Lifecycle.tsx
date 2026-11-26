// spec/app/workflows/index.md, "Story: Change a workflow"
import { Effect } from "effect";
import { Alert, Button, Input, Switch, WorkflowAction, WorkflowActions, cn, focusRing } from "@repo/ui";
import { Pencil, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";
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

const labels = { TurnOn: "Turn on", TurnOff: "Turn off", Rename: "Rename", Remove: "Remove", Restore: "Confirm restore" } satisfies Record<Change, string>;

function reviewCopy(change: Change, outcomeUnknown: boolean, name: string) {
  switch (change) {
    case "TurnOn": return "This schedule runs while this phone and its agent are on. Android can delay a run.";
    case "Rename": return `The workflow will be named “${name}”.`;
    case "Remove": return outcomeUnknown
      ? "A run was interrupted and its outcome is unknown. Removing keeps its history."
      : "Keeps history; stops future runs.";
    case "Restore": return "Restore paused; review before enabling.";
    case "TurnOff": return "The schedule stops.";
  }
}

function useLifecycle({ runtime, row, owner }: Pick<LifecycleProps, "runtime" | "row" | "owner">) {
  const model = useMachine(runtime);
  const state = model.state;
  const shown = state !== undefined && state.owner === owner && state.target === row && state.open ? state : undefined;
  const send = (event: Event) => { if (model.can(event)) void model.send(event); };
  return { model, state: shown, send };
}

/** The header switch that turns the workflow on or off; turning a schedule on is reviewed first. */
export function LifecyclePower({ runtime, row, owner, title, unfinished, interrupted }: LifecycleProps) {
  const { model, state, send } = useLifecycle({ runtime, row, owner });
  if (state === undefined || state.detail.status !== "Loaded") return null;
  const flip: Event = { type: "flip", wanted: state.active ? "TurnOff" : "TurnOn" };
  const power: Event = state.scheduled && !state.active ? { type: "reviewChange", wanted: "TurnOn", unfinished, interrupted } : flip;
  return <Switch aria-label={`Turn ${title} on or off`} checked={state.active} disabled={state.removed || !model.can(power)}
    className={cn("mr-3 ml-1.5", state.removed && "disabled:opacity-45")} onCheckedChange={() => send(power)} />;
}

/** The review of a change under the workflow's title: what it does, then confirm or cancel. */
export function LifecycleReview({ runtime, row, owner, unfinished }: Pick<LifecycleProps, "runtime" | "row" | "owner" | "unfinished">) {
  const { state, send } = useLifecycle({ runtime, row, owner });
  if (state === undefined || !state.review.showing) return null;
  const confirmation: Event = state.change.offered ? { type: "confirmResend" } : { type: "confirmChange", unfinished };
  const name = state.proposed === "Rename" ? runtime.runSync(Effect.flatMap(DefinitionWords, (definition) => definition.name(row))) : "";
  return (
    <div role="group" aria-label="Review workflow change" className="mt-4.5 rounded-action bg-secondary p-4">
      <p className="text-base leading-chat">{reviewCopy(state.proposed, state.unknownShown, name)}</p>
      <div className="mt-3.5 flex flex-wrap gap-2">
        <button type="button" onClick={() => send(confirmation)}
          className={cn(focusRing, "min-h-11 rounded-full bg-primary px-4 py-2.5 font-semibold text-primary-foreground")}>{state.change.offered ? "Send again" : labels[state.proposed]}</button>
        <button type="button" onClick={() => send({ type: "cancelReview" })}
          className={cn(focusRing, "min-h-11 rounded-full bg-background px-4 py-2.5 font-semibold")}>Cancel</button>
      </div>
    </div>
  );
}

interface LifecycleRowProps extends LifecycleProps {
  /** The standing shown at the start of the row. */
  readonly status: string;
  /** The round run button, beside the actions. */
  readonly run?: ReactNode;
}

/** The workflow's standing, its run button and its further actions, with the change's progress under them. */
export function Lifecycle({ runtime, row, owner, title, unfinished, interrupted, status, run }: LifecycleRowProps) {
  const { model, state, send } = useLifecycle({ runtime, row, owner });
  const [name, setName] = useState<string>();
  if (state === undefined) return null;
  const request = (wanted: Change): Event => ({ type: "reviewChange", wanted, unfinished, interrupted });
  const rename = model.can({ type: "editName", chars: state.renaming === 1 ? 0 : 1 }) && name === undefined;
  const remove = request("Remove");
  const restore = request("Restore");
  return (
    <section aria-label="Workflow controls">
      {state.detail.status === "Failed" && (
        <Alert role="status" variant="warn" className="mt-3.5">The workflow couldn’t be opened.
          <Button variant="secondary" size="sm" onClick={() => send({ type: "readWorkflow" })}>Retry</Button>
        </Alert>
      )}
      <div className="mt-3.5 flex items-center gap-2">
        <span role="status" aria-label="Workflow run status" className="min-w-0 flex-1 text-caption leading-chat text-muted-foreground">{status}</span>
        {run}
        {(rename || model.can(remove) || model.can(restore)) && <WorkflowActions label="Workflow actions" align="end">
          {rename && <WorkflowAction icon={<Pencil aria-hidden />} onClick={() => setName(title)}>Change</WorkflowAction>}
          {model.can(remove) && <WorkflowAction icon={<Trash2 aria-hidden />} onClick={() => send(remove)}>Remove workflow</WorkflowAction>}
          {model.can(restore) && <WorkflowAction icon={<Trash2 aria-hidden />} onClick={() => send(restore)}>Restore workflow</WorkflowAction>}
        </WorkflowActions>}
      </div>
      {name !== undefined && (
        <form className="mt-5 flex flex-col gap-3" onSubmit={(event) => {
          event.preventDefault();
          void runtime.runPromiseExit(reviewName(row, name, unfinished, interrupted));
          setName(undefined);
        }}>
          <Input aria-label="Workflow name" value={name} required maxLength={80} placeholder="Workflow name" onChange={(event) => setName(event.currentTarget.value)}
            className="h-auto min-h-12 rounded-none border-0 border-b border-border bg-transparent px-0 py-1.5 text-2xl leading-row font-semibold" />
          <div className="flex gap-2">
            <button type="submit" disabled={name.trim() === ""}
              className={cn(focusRing, "min-h-11 rounded-full bg-primary px-4.5 font-semibold text-primary-foreground disabled:opacity-50")}>Review</button>
            <button type="button" onClick={() => setName(undefined)}
              className={cn(focusRing, "min-h-11 rounded-full bg-secondary px-4.5 font-semibold")}>Cancel</button>
          </div>
        </form>
      )}
      {state.change.live && <p role="status" className="mt-3 text-sm text-muted-foreground">Waiting for your agent…</p>}
      {model.can({ type: "checkChange" }) && (
        <Alert role="status" variant="warn" className="mt-3">Your agent didn’t confirm the change.
          <Button variant="secondary" size="sm" onClick={() => send({ type: "checkChange" })}>Check change</Button>
        </Alert>
      )}
      {model.can({ type: "reviewResend" }) && (
        <Button variant="secondary" onClick={() => send({ type: "reviewResend" })}>Review the same change</Button>
      )}
      {model.can({ type: "letGo" }) && (
        <Button variant="secondary" className="mt-3" onClick={() => send({ type: "letGo" })}>Allow a different change</Button>
      )}
      {state.change.attempt.outcome === "Refused" && !state.change.offered && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">Your agent didn’t apply the change.</p>
      )}
    </section>
  );
}
