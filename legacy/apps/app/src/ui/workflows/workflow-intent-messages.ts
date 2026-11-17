/**
 * The shared pending-request journal's refusals (`@elizaos/contracts/workflow-intents`, which
 * Alpha's `runtime/workflow-intents.ts` extends), keyed by their reviewed text. Each is raised
 * before or while the request is recorded on this phone, so the owner is told what that means.
 */
export const WORKFLOW_INTENT_REFUSALS: ReadonlyMap<string, string> = new Map([
  [
    "Workflow intent belongs to another agent",
    "This request was saved for a different agent, so it wasn’t sent.",
  ],
  [
    "Workflow request history needs recovery",
    "Alpha’s record of earlier requests needs recovery, so nothing was sent. Reopen Alpha and try again.",
  ],
  [
    "Workflow intent save unconfirmed",
    "Alpha couldn’t confirm it saved this request on the phone. Refresh before trying again.",
  ],
  [
    "Workflow request changed. Refresh its receipt before trying again.",
    "This request changed in another window. Refresh before trying again.",
  ],
]);

/** Alpha's sentence for a pending-request journal refusal, or undefined for any other error. */
export function workflowIntentText(error: unknown): string | undefined {
  return error instanceof Error
    ? WORKFLOW_INTENT_REFUSALS.get(error.message.trim())
    : undefined;
}
