// spec/app/workflows/runs.md, "Story: Run a workflow now"; spec/app/workflows/runs.md, "Story: Stop a run"
import { Alert, Button, cn, focusRing } from "@repo/ui";
import { Play, Square } from "lucide-react";
import { useMachine } from "../../gen/app__workflows__runs.react.ts";
import { useMachine as useWorkflow } from "../../gen/app__workflows.react.ts";
import type { Event } from "../../gen/app__workflows__runs.ts";
import type { Machine } from "../../gen/app__workflows__runs.effect.vibe";
import type { Machine as WorkflowMachine } from "../../gen/app__workflows.effect.vibe";
import type { Resident, Shown } from "../runtime/area.tsx";

interface RunControlsProps extends Pick<Shown<Resident | Machine | WorkflowMachine>, "runtime"> {
  readonly row: number;
  readonly owner: number;
  readonly title: string;
}

function useRuns({ runtime, row, owner }: Omit<RunControlsProps, "title">) {
  const runs = useMachine(runtime);
  const current = useWorkflow(runtime).state;
  const state = runs.state;
  const ready = state !== undefined && state.owner === owner && state.workflow === row && current !== undefined && current.target === row && current.owner === owner;
  const send = (event: Event) => { if (runs.can(event)) void runs.send(event); };
  return { runs, state: ready ? state : undefined, current: ready ? current : undefined, send };
}

/** The round run button; pressed once it widens into Confirm run, and a second press runs the version shown. */
export function RunButton(props: Omit<RunControlsProps, "title">) {
  const { runs, state, current, send } = useRuns(props);
  if (!state || !current) return null;
  const review: Event = { type: "reviewRun", version: current.version, removed: current.removed };
  const confirm: Event = state.request.offered
    ? { type: "confirmResend", version: current.version }
    : { type: "confirmRun", version: current.version, removed: current.removed };
  const definitionReady = current.open && current.detail.status === "Loaded";
  if (state.review.showing) {
    const label = state.request.offered ? "Send again" : "Confirm run";
    return <button type="button" aria-label={label} onClick={() => send(confirm)}
      className={cn(focusRing, "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-4 text-primary-foreground")}><Play aria-hidden className="size-5.5" />{label}</button>;
  }
  if (!definitionReady || state.reading.status !== "Loaded" || !runs.can(review)) return null;
  return <button type="button" aria-label="Run now" title="Run now" onClick={() => send(review)}
    className={cn(focusRing, "grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground")}><Play aria-hidden className="size-5.5" /></button>;
}

/** Stop a run, and what the agent has or has not confirmed about the last request. */
export function RunControls({ runtime, row, owner }: RunControlsProps) {
  const { runs, state, current, send } = useRuns({ runtime, row, owner });
  if (!state || !current) return null;
  return (
    <section aria-label="Run controls" className="flex flex-col gap-2 empty:hidden">
      {(runs.can({ type: "stopRun" }) || state.reading.status === "Failed") && <div className="mt-3 flex flex-wrap gap-2">
        {runs.can({ type: "stopRun" }) && <Button variant="secondary" onClick={() => send({ type: "stopRun" })}><Square aria-hidden />Stop run</Button>}
        {state.reading.status === "Failed" && <Button variant="secondary" onClick={() => send({ type: "readLatest" })}>Refresh run status</Button>}
      </div>}
      {state.request.live && <p role="status" className="text-sm text-muted-foreground">Waiting for the agent to start the run…</p>}
      {runs.can({ type: "checkRun" }) && <Alert variant="warn" role="status">
        Your agent didn’t confirm whether it started the run.
        <Button variant="secondary" size="sm" onClick={() => send({ type: "checkRun" })}>Check run</Button>
      </Alert>}
      {runs.can({ type: "reviewResend", version: current.version }) && (
        <Button variant="secondary" onClick={() => send({ type: "reviewResend", version: current.version })}>Review the same request</Button>
      )}
      {runs.can({ type: "letGo" }) && (
        <Button variant="secondary" onClick={() => send({ type: "letGo" })}>Allow a new run</Button>
      )}
    </section>
  );
}
