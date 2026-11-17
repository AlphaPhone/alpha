/**
 * How a workflow run and its scheduled occurrences read in Alpha: the run's status, the text of
 * an occurrence the agent recorded without running, the error and reconciliation notes of a run,
 * its event log, its approval states and the titles of its phone steps.
 *
 * The agent's workflow service (`plugins/plugin-workflow`) answers with status identifiers, engine
 * event types and its own English sentences: the not-run occurrence texts of
 * `services/phone-workflow-spec.ts`, `services/embedded-workflow-service.ts`,
 * `services/hosted-digest.ts` (`DIGEST_*_TEXT` from `services/hosted-digest-policy.ts`) and
 * `MISSED_SCHEDULED_OCCURRENCE_TEXT` (`packages/core/src/services/trigger-scheduling.ts`). Each
 * known sentence or identifier has its own Alpha wording here; anything else reads as a
 * context-specific Alpha sentence, never as the agent's text. A run's own output (what the
 * workflow produced) and the approval request a workflow author wrote are content, not copy, and
 * are shown as they are.
 */

export type WorkflowNotRunStatus = "missed" | "overlap" | "unavailable";

/** Each reviewed not-run sentence the agent records, with Alpha's sentence for it. */
export const OCCURRENCE_NOT_RUN_TEXT: ReadonlyMap<string, string> = new Map([
  // services/phone-workflow-spec.ts: a typed schedule admitted after its window.
  [
    "The scheduled time passed while the agent was not running. This occurrence did not run and will not run later.",
    "This occurrence missed its run window and did not run.",
  ],
  // packages/core trigger-scheduling.ts, recorded by the workflow service for a generic schedule.
  [
    "The scheduled time passed while the agent was not running. This occurrence did not run, and no backlog is executed.",
    "Your agent wasn’t running at the scheduled time, so this occurrence didn’t run. Nothing runs late.",
  ],
  // services/embedded-workflow-service.ts.
  [
    "The agent stopped before this scheduled run started. Nothing ran, and it will not run later.",
    "Your agent stopped before this scheduled run began. Nothing ran, and it won’t run later.",
  ],
  [
    "An earlier run of this workflow was still active. This occurrence did not run.",
    "The previous run of this workflow was still going, so this occurrence didn’t run.",
  ],
  // services/hosted-digest-policy.ts (DIGEST_MISSED_TEXT, DIGEST_OVERLAP_TEXT, DIGEST_PAUSED_TEXT,
  // DIGEST_SOURCE_UNAVAILABLE_TEXT).
  [
    "The scheduled time was missed. No backlog was executed.",
    "This digest missed its scheduled time, so it didn’t run. Nothing runs late.",
  ],
  [
    "An earlier occurrence is still active. This occurrence did not run.",
    "The previous digest was still running, so this one didn’t run.",
  ],
  [
    "Source expired. This schedule is paused until you renew the source. No fresh phone data was read.",
    "The source expired, so this schedule is paused until you renew it. No new phone data was read.",
  ],
  [
    "Source revoked. This schedule is paused until you review a new source. No fresh phone data was read.",
    "The source was revoked, so this schedule is paused until you review a new one. No new phone data was read.",
  ],
  [
    "The reviewed source is revoked or expired. No fresh phone data was read.",
    "The source you reviewed was revoked or has expired, so this didn’t run. No new phone data was read.",
  ],
]);

/** services/phone-workflow-spec.ts: a reviewed local time the clocks skipped. */
const CLOCK_SKIPPED =
  /^(\d{2}:\d{2}) did not occur on (\d{4}-\d{2}-\d{2}) in (\S+) because the clocks moved forward\. This occurrence did not run and will not run later\.$/;

/** A not-run occurrence whose text Alpha does not recognise, by its status. */
const NOT_RUN_FALLBACK: Readonly<Record<WorkflowNotRunStatus, string>> = {
  missed: "This occurrence missed its scheduled time and didn’t run.",
  overlap: "An earlier run was still going, so this occurrence didn’t run.",
  unavailable: "This occurrence’s source can’t be read, so it didn’t run. No phone data was read.",
};

export function isWorkflowNotRunStatus(status: unknown): status is WorkflowNotRunStatus {
  return status === "missed" || status === "overlap" || status === "unavailable";
}

/**
 * Alpha's sentence for the text the agent recorded for an occurrence it did not run, or
 * undefined when the text is not a recorded not-run sentence and the status is not a not-run one
 * (the text is then the workflow's own output).
 */
export function occurrenceNotRunText(status: unknown, text: unknown): string | undefined {
  const value = typeof text === "string" ? text.trim() : "";
  const known = OCCURRENCE_NOT_RUN_TEXT.get(value);
  if (known) return known;
  const skipped = CLOCK_SKIPPED.exec(value);
  if (skipped)
    return `${skipped[1]} didn’t happen on ${skipped[2]} in ${skipped[3]} because the clocks went forward, so this occurrence didn’t run.`;
  return isWorkflowNotRunStatus(status) ? NOT_RUN_FALLBACK[status] : undefined;
}

/** Each workflow execution status (`WorkflowExecutionStatus`) and trigger run status. */
const RUN_STATUS: Readonly<Record<string, string>> = {
  cancelled: "Cancelled",
  completed: "Completed",
  continued: "Continued in a new run",
  failed: "Failed",
  finished: "Finished",
  paused: "Paused",
  queued: "Queued",
  running: "Running",
  "waiting-approval": "Waiting for approval",
  "waiting-event": "Waiting for an event",
  "waiting-quota": "Waiting for capacity",
  "waiting-timer": "Waiting for a timer",
  success: "Finished",
  succeeded: "Finished",
  error: "Failed",
  skipped: "Skipped",
};

/** Alpha's word for a run status the agent reports. */
export function workflowRunStatusLabel(status: unknown): string {
  return typeof status === "string" && Object.hasOwn(RUN_STATUS, status)
    ? RUN_STATUS[status]
    : "Status unknown";
}

/**
 * What the owner reads for a run the agent reports an error for. The engine's message is a
 * diagnostic (an exception, a worker lease failure) and is never shown.
 */
export function workflowRunErrorText(run: {
  status?: unknown;
  finished?: unknown;
  reconciliation?: { state?: unknown } | undefined;
}): string {
  if (run.reconciliation?.state === "outcome-unknown")
    return "Your agent lost track of this run before it finished, so what it did is unknown. Check before running it again.";
  if (run.reconciliation?.state === "worker-running")
    return "Your agent is still checking whether this run is going. Refresh in a moment.";
  if (run.status === "cancelled") return "This run was cancelled before it finished.";
  return "This run stopped with an error on your agent.";
}

/** The reconciliation note of an unfinished run, by its state. */
export function workflowReconciliationText(state: unknown): string {
  return state === "worker-running"
    ? "Your agent is checking whether this run is still going."
    : state === "outcome-unknown"
      ? "Your agent couldn’t tell how this run ended."
      : "Your agent is checking this run.";
}

/** The engine's event types (Smithers progress events) a run log shows. */
const EVENT_LABEL: Readonly<Record<string, string>> = {
  RunStarted: "Run started",
  RunFinished: "Run finished",
  RunFailed: "Run failed",
  RunCancelled: "Run cancelled",
  RunContinuedAsNew: "Continued as a new run",
  NodeStarted: "Step started",
  NodeFinished: "Step finished",
  NodeFailed: "Step failed",
  NodeSkipped: "Step skipped",
  NodeRetrying: "Step retried",
  ApprovalRequested: "Approval requested",
  ApprovalGranted: "Approved",
  ApprovalDenied: "Denied",
  TimerCreated: "Timer set",
  TimerFired: "Timer went off",
  TimerCancelled: "Timer cancelled",
  progress: "Progress",
};

/** Alpha's label for one run event type; an unknown type reads as a step update. */
export function workflowEventLabel(type: unknown): string {
  return typeof type === "string" && Object.hasOwn(EVENT_LABEL, type)
    ? EVENT_LABEL[type]
    : "Step update";
}

/** A decided approval's state (`approved` or `denied`); anything else is closed. */
export function workflowApprovalStatusLabel(status: unknown): string {
  return status === "approved" ? "Approved" : status === "denied" ? "Denied" : "Closed";
}

/**
 * The title of a workflow phone step. The device-action review names each step by its operation
 * type with spaces (`read selected notes`); Alpha names it here.
 */
const PHONE_STEP_TITLE: Readonly<Record<string, string>> = {
  "read selected reminders": "Read reminders",
  "read selected notes": "Read selected notes",
  "read calendar range": "Read calendars",
  "create note": "Save a note",
  "post notification": "Post notification",
  "speak text": "Read aloud",
};

export function workflowPhoneStepTitle(title: unknown): string {
  return typeof title === "string" && Object.hasOwn(PHONE_STEP_TITLE, title)
    ? PHONE_STEP_TITLE[title]
    : "Phone step";
}
