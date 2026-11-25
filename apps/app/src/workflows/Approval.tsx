// spec/app/workflows/approvals.md, "Story: Answer a run's approval on the phone"
import { Effect } from "effect";
import { Alert, Button } from "@repo/ui";
import { useMachine } from "../../gen/app__workflows__approvals.react.ts";
import type { Machine } from "../../gen/app__workflows__approvals.effect.vibe";
import { type Resident, type Shown } from "../runtime/area.tsx";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { ApprovalWords } from "./approvals.vibe";

interface ApprovalProps extends Pick<Shown<Resident | Machine | ApprovalWords>, "runtime"> {
  readonly run: number;
  readonly owner: number;
}

/** An exact, versioned approval the agent says is still waiting on this run. */
export function Approval({ runtime, run, owner }: ApprovalProps) {
  const machine = useTimed(runtime, useMachine);
  const state = machine.state;
  if (!state || state.owner !== owner || state.runId !== run) return null;
  const pending = runtime.runSync(Effect.flatMap(ApprovalWords, (words) => words.get()));
  if (!pending || pending.number !== state.digest || pending.owner !== owner || pending.runId !== run) return null;
  const { approval } = pending;
  const yes = { type: "decide", approve: true, now: untimed } as const;
  const no = { type: "decide", approve: false, now: untimed } as const;
  return (
    <section aria-label="Workflow approval" className="flex flex-col gap-3 rounded-tile bg-secondary p-4">
      <strong>{approval.title}</strong>
      <p className="whitespace-pre-wrap break-words">{approval.summary}</p>
      <p className="break-words text-sm text-muted-foreground">{[approval.operation, approval.target, approval.account].filter(Boolean).join(" · ")}</p>
      <div className="flex flex-wrap gap-2">
        {approval.supported && machine.can(yes) && <Button onClick={() => void machine.send(yes)}>Approve</Button>}
        {machine.can(no) && <Button variant="secondary" onClick={() => void machine.send(no)}>Decline</Button>}
        {machine.can({ type: "checkDecision" }) && <Button variant="secondary" onClick={() => void machine.send({ type: "checkDecision" })}>Check decision</Button>}
      </div>
      {state.approval === "Deciding" && <p role="status">Waiting for your agent…</p>}
      {state.approval === "Approved" && <p role="status">Approved</p>}
      {state.approval === "Denied" && <p role="status">Declined</p>}
      {state.approval === "Expired" && <Alert variant="warn" role="status">The approval expired.</Alert>}
      {state.approval === "NotApplied" && <Alert variant="warn" role="status">The agent didn’t apply the decision.</Alert>}
      {state.approval === "Unsettled" && <Alert variant="warn" role="status">The agent didn’t confirm the decision.</Alert>}
    </section>
  );
}
