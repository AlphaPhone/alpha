// spec/app/workflows/runs.md, "Story: Run a workflow now"; spec/app/workflows/runs.md, "Story: Stop a run"
import { Alert, Button, ConfirmDialog } from "@repo/ui";
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

/** Run or stop the exact workflow shown; a later retry names its retained submission. */
export function RunControls({ runtime, row, owner, title }: RunControlsProps) {
  const runs = useMachine(runtime);
  const current = useWorkflow(runtime).state;
  const state = runs.state;
  if (!state || state.owner !== owner || state.workflow !== row || !current || current.target !== row || current.owner !== owner) return null;
  const send = (event: Event) => { if (runs.can(event)) void runs.send(event); };
  const definitionReady = current.open && current.detail.status === "Loaded";
  const review: Event = { type: "reviewRun", version: current.version, removed: current.removed };
  const confirm: Event = state.request.offered
    ? { type: "confirmResend", version: current.version }
    : { type: "confirmRun", version: current.version, removed: current.removed };
  const canRun = definitionReady && state.reading.status === "Loaded" && runs.can(review);
  return (
    <section aria-label="Run controls" className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {canRun && <Button onClick={() => send(review)}><Play aria-hidden />{state.latest.id === 0 ? "Run now" : "Run again"}</Button>}
        {runs.can({ type: "stopRun" }) && <Button variant="secondary" onClick={() => send({ type: "stopRun" })}><Square aria-hidden />Stop run</Button>}
        {state.reading.status === "Failed" && <Button variant="secondary" onClick={() => send({ type: "readLatest" })}>Refresh run status</Button>}
      </div>
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
      <ConfirmDialog open={state.review.showing} title={`Run “${title}”?`} confirmLabel={state.request.offered ? "Send again" : "Run now"}
        onConfirm={() => send(confirm)} onCancel={() => send({ type: "cancelRun" })}>
        {state.request.offered ? "Alpha will send the same request. The agent can accept it only once." : "Your agent will run the version shown."}
      </ConfirmDialog>
    </section>
  );
}
