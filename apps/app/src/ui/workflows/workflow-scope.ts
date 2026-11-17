/**
 * What the workflow authoring screen says about typed phone steps: the reviewable name of each
 * typed operation, and the refusal shown when a description asks for something the typed phone
 * catalog can never do (calls, SMS, payments, Contacts, arbitrary code, email to unnamed
 * recipients). The refusal is shown before any generation request, so nothing is sent to the agent.
 *
 * Which phrasings are refused is the shared phrase classifier, `workflowScopeCategories` in
 * `@elizaos/contracts/workflow-scope`; the typed catalog stays the hard bound for anything it lets
 * through.
 */
import {
  type WorkflowScopeCategory,
  workflowScopeCategories,
} from "@elizaos/contracts/workflow-scope";

type WorkflowScopeResult =
  | { refused: false }
  | { refused: true; categories: WorkflowScopeCategory[]; message: string };

/** Reviewable names for the typed operations a phone workflow can use. */
export const WORKFLOW_OPERATION_LABELS: Readonly<Record<string, string>> = {
  supplied_text: "Read supplied text",
  selected_notes: "Read selected Notes",
  selected_reminders: "Read today’s reminders",
  calendar_range: "Read a Calendar range",
  contains: "Continue if text matches",
  compose_draft: "Compose text",
  model_draft: "Ask the agent to draft text",
  save_note: "Save a note",
  app_notification: "Post a notification",
  read_aloud: "Read aloud",
};

const reasons: Record<WorkflowScopeCategory, string> = {
  calls: "place or answer phone calls",
  sms: "send text messages",
  payments: "make payments or move money",
  contacts: "read or change Contacts",
  code: "run arbitrary code, scripts or web requests",
  email: "send email to recipients you have not named",
};

function list(items: string[]) {
  return items.length <= 1
    ? items.join("")
    : items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

/** Refuses before generation and names the operations this agent and phone can use instead. */
export function checkWorkflowScope(
  prompt: string,
  operations: readonly string[],
): WorkflowScopeResult {
  const categories = workflowScopeCategories(prompt);
  if (!categories.length) return { refused: false };
  const available = operations
    .map((id) => WORKFLOW_OPERATION_LABELS[id])
    .filter((label): label is string => !!label);
  const offer = available.length
    ? ` Workflows here can use: ${available.join("; ")}.`
    : " No typed workflow steps are available on this agent right now.";
  return {
    refused: true,
    categories,
    message: `Workflows can’t ${list(categories.map((c) => reasons[c]))}. Nothing was sent to the agent.${offer} Rephrase the request using these steps.`,
  };
}
