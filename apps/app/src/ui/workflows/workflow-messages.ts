/**
 * The words the workflow screens show when a workflow request or check fails.
 *
 * The shared workflow client (`@elizaos/contracts/workflow-client`) and the shared phone workflow
 * contract (`@elizaos/contracts/phone-workflow`) still decide what failed: the agent's refusal of
 * one exact request is a typed error class, and a specification, catalog or receipt that fails the
 * contract is a `PhoneWorkflowSpecError` naming the check. This module decides what the owner
 * reads for each: refusals by class, contract checks, client checks and generation failures by
 * the check named. The shared client raises its own checks as plain `Error`s, so those are keyed
 * on the reviewed message text. A contract check this module does not know is shown as
 * {@link UNRECOGNIZED_CHECK} and any other unknown error as {@link REQUEST_UNAVAILABLE}, never as
 * the error's own text. Two kinds of text pass through: an agent's clarification question
 * ("Workflow needs clarification: …") and the sentences Alpha's own authoring code raises.
 */
import { PhoneWorkflowSpecError } from "@elizaos/contracts/phone-workflow";
import {
  WorkflowActivationRejected,
  WorkflowAdmissionRejected,
  WorkflowHttpError,
  WorkflowLifecycleRejected,
  WorkflowMetadataRejected,
  WorkflowTypedRejected,
} from "@elizaos/contracts/workflow-client";

type ErrorClass = abstract new (...args: never[]) => Error;

/** The agent refused one exact reviewed request; nothing it names was applied. */
const REFUSALS: ReadonlyArray<readonly [ErrorClass, string]> = [
  [
    WorkflowAdmissionRejected,
    "Workflow changed before acceptance. Refresh and review the current steps before a new run.",
  ],
  [
    WorkflowTypedRejected,
    "This workflow changed on the agent before your edit was saved. Nothing was saved.",
  ],
  [
    WorkflowMetadataRejected,
    "Workflow changed before saving. Reopen Change and review the current name and description.",
  ],
  [
    WorkflowLifecycleRejected,
    "Removal or restore was not applied. Refresh the workflow and review its version, cleanup and any ongoing executions.",
  ],
  [
    WorkflowActivationRejected,
    "This workflow changed before its schedule was turned on. Nothing was enabled. Review the current version first.",
  ],
];

/** Any other refusal or failure of a workflow route: the outcome of a run may be unknown. */
const REQUEST_UNAVAILABLE =
  "Workflow request unavailable. Check execution history before repeating a run.";

/** Each check of the shared phone workflow contract, with what the owner reads for it. */
const CONTRACT_CHECKS: Readonly<Record<string, string>> = {
  "Expected a typed workflow object": "Expected a typed workflow object",
  "Unsupported workflow field": "Unsupported workflow field",
  "Complete the workflow text fields within their stated limits":
    "Complete the workflow text fields within their stated limits",
  "Invalid device or source identity": "Invalid device or source identity",
  "Use canonical UTC times with milliseconds":
    "Use canonical UTC times with milliseconds",
  "Select 1 to 16 calendars": "Select 1 to 16 calendars",
  "Choose distinct calendars and a range of at most 7 days":
    "Choose distinct calendars and a range of at most 7 days",
  "Choose a valid calendar time zone": "Choose a valid calendar time zone",
  "Choose between 1 and 200 events": "Choose between 1 and 200 events",
  "Choose which reminders this step reads":
    "Choose which reminders this step reads",
  "This reminder window is unavailable": "This reminder window is unavailable",
  "Choose a valid reminder time zone": "Choose a valid reminder time zone",
  "Choose between 1 and 200 reminders": "Choose between 1 and 200 reminders",
  "Choose when this workflow runs": "Choose when this workflow runs",
  "This workflow trigger is unavailable":
    "This workflow trigger is unavailable",
  "Choose a local time, a valid time zone and at least one day":
    "Choose a local time, a valid time zone and at least one day",
  "Workflow draft exceeds 64 KiB": "Workflow draft exceeds 64 KiB",
  "Unsupported workflow version": "Unsupported workflow version",
  "Add between 1 and 32 steps": "Add between 1 and 32 steps",
  "Step identity is invalid": "Step identity is invalid",
  "Select 1 to 16 Notes": "Select 1 to 16 Notes",
  "A selected note changed. Select it again":
    "A selected note changed. Select it again",
  "Select each note once": "Select each note once",
  "Choose an earlier step as the input": "Choose an earlier step as the input",
  "Choose whether letter case must match":
    "Choose whether letter case must match",
  "This workflow operation is unavailable":
    "This workflow operation is unavailable",
  "A verified phone enrollment is required":
    "A verified phone enrollment is required",
  "This workflow has no schedule": "This workflow has no schedule",
  "Choose a valid local day and time zone":
    "Choose a valid local day and time zone",
  "Unsupported workflow capabilities": "Unsupported workflow capabilities",
  "Invalid trigger capability": "Invalid trigger capability",
  "Invalid operation catalog": "Invalid operation catalog",
  "Invalid operation capability": "Invalid operation capability",
  "Agent capabilities changed. Review the available steps again.":
    "Agent capabilities changed. Review the available steps again.",
  "Saved workflow receipt identity mismatch":
    "Saved workflow receipt identity mismatch",
  "Invalid scheduled occurrence": "Invalid scheduled occurrence",
};

/**
 * The shared workflow client's own checks, raised as plain errors, keyed by the reviewed message
 * text. Checks that only guard the integrity of an agent reply share {@link INVALID_REPLY}.
 */
const INVALID_REPLY =
  "The agent's workflow reply could not be verified. Refresh and check execution history before repeating a run.";
const CLIENT_CHECKS: Readonly<Record<string, string>> = {
  "Typed generation is unavailable on this agent":
    "This agent cannot draft a workflow from a description. Add the steps yourself.",
  "Describe the workflow in 1–4000 characters":
    "Describe the workflow in 1 to 4000 characters.",
  "Generated draft exceeds the response limit":
    "The agent's draft was too large. Your current draft is unchanged.",
  "Generated draft changed when this workflow runs":
    "The agent's draft changed when this workflow runs. Your current draft is unchanged.",
  "Generated draft changed the available device or operations":
    "The agent's draft used steps this phone did not offer. Your current draft is unchanged.",
  "Generated draft changed a selected read scope":
    "The agent's draft changed what a step reads. Your current draft is unchanged.",
  "Agent validation changed the reviewed workflow":
    "The agent changed the workflow while checking it. Review it again before saving.",
  "Workflow changed. Review it again before running.":
    "Workflow changed. Review it again before running.",
  "Workflow changed. Review it again before enabling.":
    "Workflow changed. Review it again before enabling.",
  "Pause was not confirmed":
    "The agent did not confirm the pause. Refresh the workflow to check its schedule.",
  "Activation was not confirmed":
    "The agent did not confirm turning the schedule on. Refresh the workflow to check it.",
  "Decision not confirmed":
    "The agent did not confirm your decision. Refresh the approval to check it.",
  "Approval is not reviewable": "This approval can no longer be reviewed.",
  "Workflow capability unavailable":
    "This agent does not offer phone workflows.",
  "Metadata editing unavailable": "This agent cannot rename workflows.",
  "Metadata reconciliation unavailable":
    "This agent cannot confirm a rename. Refresh the workflow.",
  "Removed workflow history unavailable":
    "This agent cannot list removed workflows.",
  "Reviewed removal unavailable":
    "This agent cannot remove a reviewed workflow.",
  "Lifecycle outcome unknown":
    "The agent did not report whether the change was applied. Refresh the workflow before trying again.",
  "Agent does not support submission reconciliation":
    "This agent cannot confirm whether a run started. Check execution history before repeating it.",
  ...Object.fromEntries(
    [
      "Invalid workflow response",
      "Invalid workflow field",
      "Invalid execution reconciliation",
      "Invalid workflow",
      "Invalid execution",
      "Invalid execution events",
      "Execution event identity mismatch",
      "Approval receipt identity mismatch",
      "Approval identity mismatch",
      "Unsupported approval field",
      "Missing approval node",
      "Invalid save identity",
      "Save identity changed",
      "Metadata receipt mismatch",
      "Invalid workflow metadata",
      "Metadata values mismatch",
      "Invalid metadata mutation",
      "Metadata identity mismatch",
      "Invalid removed workflows",
      "Removed state mismatch",
      "Mutation identity mismatch",
      "Lifecycle receipt mismatch",
      "Invalid lifecycle reconciliation",
      "Invalid workflow list",
      "Workflow identity changed",
      "Submission identity mismatch",
      "Execution identity or reviewed version changed",
      "Invalid retained submission",
      "Submission identity changed",
      "Reconciled execution mismatch",
      "Invalid execution list",
      "Execution identity mismatch",
      "Cancellation identity mismatch",
    ].map((check) => [check, INVALID_REPLY]),
  ),
};

/** The sentences Alpha's own workflow authoring raises (`prototype/workflow-authoring.ts`). */
const OWN_NOTICES: ReadonlySet<string> = new Set([
  "Add a Read step first",
  "Calendar read permission was not granted",
  "Changed",
  "Choose Connect calendars to grant read access",
  "Draft changed in another window. Close and reopen it before editing.",
  "Local draft is too large",
  "Local draft needs recovery",
  "Notes changed. Reopen Notes before selecting",
  "Notes is unavailable. Reconnect your agent, then try again.",
  "Note text is unavailable",
  "Reconnect this agent to verify phone enrollment",
  "Resolve local draft storage before saving",
  "Saved draft exceeds the recovery limit",
  "Saved draft requires recovery",
  "Saved on agent; local draft cleanup needs recovery",
  "This operation needs a newer qualified phone capability",
  "This agent cannot save a Calendar range from the run day. Choose fixed dates or reconnect to an updated agent.",
]);

/** The agent's own clarification question for a description it could not draft from. */
const AGENT_CLARIFICATION = "Workflow needs clarification: ";

/** A contract check this module has no words for (a newer shared contract). */
export const UNRECOGNIZED_CHECK =
  "This workflow could not be checked. Review its steps and try again.";

/**
 * Generation failures the shared client reports as plain errors: the agent refused the request
 * (an agent clarification question passes through unchanged) or could not produce a valid draft.
 */
const GENERATION_FAILURES: Readonly<Record<string, string>> = {
  "The request needs clarification. Select any Notes or Calendar scope first, and describe a manual workflow using the available steps.":
    "The request needs clarification. Select any Notes or Calendar scope first, and describe a manual workflow using the available steps.",
  "The agent could not generate a valid draft. Your current draft is unchanged.":
    "The agent could not generate a valid draft. Your current draft is unchanged.",
};

/** What the owner reads when the agent refused one exact request, or undefined for any other error. */
export function workflowRefusalText(error: unknown): string | undefined {
  return REFUSALS.find(([type]) => error instanceof type)?.[1];
}

/**
 * What the owner reads for a failed workflow request or check: `fallback` when it is not an
 * Error, and `unknown` for an error this module does not recognise.
 */
export function workflowErrorText(
  error: unknown,
  fallback: string,
  unknown: string = REQUEST_UNAVAILABLE,
): string {
  // An error from another realm (a worker or a test harness) is still an Error.
  if (
    !(error instanceof Error) &&
    Object.prototype.toString.call(error) !== "[object Error]"
  )
    return fallback;
  const { message } = error as Error;
  if (typeof message !== "string") return unknown;
  if (error instanceof PhoneWorkflowSpecError)
    return Object.hasOwn(CONTRACT_CHECKS, message)
      ? CONTRACT_CHECKS[message]
      : UNRECOGNIZED_CHECK;
  const refusal = workflowRefusalText(error);
  if (refusal) return refusal;
  if (error instanceof WorkflowHttpError) return REQUEST_UNAVAILABLE;
  if (Object.hasOwn(GENERATION_FAILURES, message))
    return GENERATION_FAILURES[message];
  if (Object.hasOwn(CLIENT_CHECKS, message)) return CLIENT_CHECKS[message];
  if (
    OWN_NOTICES.has(message) ||
    (message.startsWith(AGENT_CLARIFICATION) &&
      message.length > AGENT_CLARIFICATION.length)
  )
    return message;
  return unknown;
}
