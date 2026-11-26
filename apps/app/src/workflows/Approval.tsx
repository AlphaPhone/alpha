// spec/app/workflows/approvals.md, "Story: Answer a run's approval on the phone"
import type { WorkflowApproval } from "@elizaos/plugin-workflow-client";
import { Effect } from "effect";
import { useState, useSyncExternalStore } from "react";
import { Alert, cn, focusRing } from "@repo/ui";
import { useMachine } from "../../gen/app__workflows__approvals.react.ts";
import type { Machine } from "../../gen/app__workflows__approvals.effect.vibe";
import { type Resident, type Shown } from "../runtime/area.tsx";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { ApprovalWords, sameAsking, stopReviewedWorkflowSpeech } from "./approvals.vibe";

interface ApprovalProps extends Pick<Shown<Resident | Machine | ApprovalWords>, "runtime"> {
  readonly run: number;
  readonly owner: number;
  readonly approvals?: readonly WorkflowApproval[];
}

const noticeMessages = {
  Gone: "This approval is no longer waiting.",
  OtherAgent: "This approval belongs to another agent.",
  Lapsed: "This approval expired before it could be opened.",
  Unreadable: "The approval couldn’t be checked.",
} as const;

/** An exact, versioned approval the agent says is still waiting on this run. */
export function Approval({ runtime, run, owner, approvals }: ApprovalProps) {
  const machine = useTimed(runtime, useMachine);
  const words = runtime.runSync(ApprovalWords);
  const pending = useSyncExternalStore(words.subscribe, words.snapshot, words.snapshot);
  const state = machine.state;
  if (!state || state.owner !== owner) return null;
  if (state.tapRun === run && (state.opened === "Gone" || state.opened === "OtherAgent" || state.opened === "Lapsed" || state.opened === "Unreadable") && state.approval === "NoApproval") {
    return <Alert variant="warn" role="status">{noticeMessages[state.opened]}</Alert>;
  }
  if (state.runId !== run || state.approval === "NoApproval") return null;
  if (!pending || pending.number !== state.digest || pending.owner !== owner || pending.runId !== run) return null;
  const { approval } = pending;
  if (state.approval === "Waiting" && !approvals?.some((current) => current.status === "pending" && sameAsking(approval, current))) return null;
  const yes = { type: "decide", approve: true, now: untimed } as const;
  const no = { type: "decide", approve: false, now: untimed } as const;
  const chip = state.approval === "Waiting" ? "Waiting" : state.approval === "Deciding" ? "Waiting for your agent…"
    : state.approval === "Approved" ? "Approved" : state.approval === "Denied" ? "Denied" : "";
  const pill = cn(focusRing, "min-h-11 rounded-full px-4.5");
  return (
    <section aria-label="Workflow approval" className="mt-5.5 flex flex-col gap-3 rounded-panel bg-secondary px-5 py-4.5 text-base leading-transcript">
      <strong className="font-semibold">{approval.title}</strong>
      <p className="truncate">{approval.summary}</p>
      <p className="text-caption leading-transcript break-words text-muted-foreground">{[approval.operation, approval.target, approval.account].filter(Boolean).join(" · ")}</p>
      <details className="text-sm leading-chat wrap-anywhere">
        <summary className={cn(focusRing, "min-h-11 cursor-pointer py-3 font-semibold")}>Details</summary>
        <p className="whitespace-pre-wrap">{approval.summary}</p>
      </details>
      {chip !== "" && <p role="status" className="inline-flex items-center gap-1.5 self-start rounded-sm bg-background px-2.5 py-0.5 text-caption font-semibold">
        <span aria-hidden className="size-2 rounded-full bg-muted-foreground" />{chip}
      </p>}
      {(machine.can(no) || (approval.supported && machine.can(yes)) || machine.can({ type: "checkDecision" })) && <div className="flex flex-wrap gap-3">
        {machine.can(no) && <button type="button" className={cn(pill, "bg-background")} onClick={() => void machine.send(no)}>Deny</button>}
        {approval.supported && machine.can(yes) && <button type="button" className={cn(pill, "bg-primary text-primary-foreground")} onClick={() => void machine.send(yes)}>Approve</button>}
        {machine.can({ type: "checkDecision" }) && <button type="button" className={cn(pill, "bg-background")} onClick={() => void machine.send({ type: "checkDecision" })}>Check decision</button>}
      </div>}
      {state.approval === "Expired" && <Alert variant="warn" role="status">The approval expired.</Alert>}
      {state.approval === "NotApplied" && <Alert variant="warn" role="status">The agent didn’t apply the decision.</Alert>}
      {state.approval === "Unsettled" && <Alert variant="warn" role="status">The agent didn’t confirm the decision.</Alert>}
    </section>
  );
}


const operations = {
  read_selected_notes: "Read selected notes",
  read_calendar_range: "Read calendar range",
  read_selected_reminders: "Read reminders for the reviewed day",
  create_note: "Save in Notes",
  post_notification: "Post an Alpha notification",
  speak_text: "Read text aloud",
} as const;

/** The phone's own proposal, after the agent has recorded its workflow approval. */
export function WorkflowDeviceApproval({ runtime, run, owner }: ApprovalProps) {
  const machine = useTimed(runtime, useMachine);
  const [approvedSpeech, setApprovedSpeech] = useState<number>();
  const state = machine.state?.device;
  if (!state || state.runNumber !== run || state.phase === "DeviceIdle") return null;
  const shown = runtime.runSync(Effect.flatMap(ApprovalWords, (words) => words.device()));
  if (!shown || shown.owner !== owner || shown.number !== state.number) return null;
  const allow = { type: "decideDevice", number: shown.number, runNumber: run, approved: true, now: untimed } as const;
  const deny = { ...allow, approved: false };
  const pill = cn(focusRing, "min-h-11 rounded-full px-4.5");
  const seen = new Map<string, number>();
  const detailLines = shown.detail.map((line) => {
    const count = (seen.get(line) ?? 0) + 1;
    seen.set(line, count);
    return { key: `${shown.number}:${line}:${count}`, line };
  });
  return (
    <section aria-label="Review device action" className="mt-5.5 flex flex-col gap-3 rounded-panel bg-secondary px-5 py-4.5 text-base leading-transcript">
      <strong className="font-semibold">{operations[shown.offer.operation.type]}</strong>
      <details className="text-sm leading-chat wrap-anywhere">
        <summary className={cn(focusRing, "min-h-11 cursor-pointer py-3 font-semibold")}>Details</summary>
        {detailLines.map(({ key, line }) => (
          <p key={key} className="whitespace-pre-wrap">{line}</p>
        ))}
      </details>
      {(machine.can(allow) || machine.can(deny)) && (
        <div className="flex flex-wrap gap-3">
          {machine.can(deny) && <button type="button" className={cn(pill, "bg-background")} onClick={() => void machine.send(deny)}>Deny</button>}
          {machine.can(allow) && <button type="button" className={cn(pill, "bg-primary text-primary-foreground")} onClick={() => {
            if (shown.offer.operation.type === "speak_text") setApprovedSpeech(shown.number);
            void machine.send(allow);
          }}>Approve device action</button>}
        </div>
      )}
      {state.phase === "DeviceSending" && <p role="status">Waiting for your phone…</p>}
      {state.phase === "DeviceSending" && approvedSpeech === shown.number && (
        <button type="button" className={cn(pill, "self-start bg-background")} onClick={() => {
          setApprovedSpeech(undefined);
          runtime.runFork(stopReviewedWorkflowSpeech(shown.number, owner, run));
        }}>Stop reading</button>
      )}
      {state.phase === "DeviceUnconfirmed" && <Alert variant="warn" role="status">The outcome couldn’t be confirmed. Check the run before trying again.</Alert>}
    </section>
  );
}
