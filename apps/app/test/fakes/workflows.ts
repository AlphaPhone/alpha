import { type Route, readJsonBody } from "./routes.ts";

const record = {
  id: "monthly-statement",
  versionId: "monthly-statement-v3",
  name: "Monthly statement",
  description: "",
  active: false,
  removed: false,
  steps: [{ label: "Supplied text" }],
};
const removed = {
  ...record,
  id: "retired-brief",
  versionId: "retired-brief-v2",
  name: "Retired brief",
  removed: true,
  triggerCleanup: "complete",
};
const startedAt = "2026-11-24T07:00:00.000Z";
const receipt = {
  id: "monthly-statement-r1", workflowId: record.id, workflowVersionId: record.versionId,
  status: "finished", startedAt, finished: true, output: "Your statement is ready.",
};

type Statement = typeof record & { triggerCleanup?: "complete" };

export interface WorkflowsScene {
  readonly admissions: Array<{ submission: string; version: string }>;
  /** Each lifecycle change the agent applied, in order: what it did and the version it was asked on. */
  readonly changes: Array<{ operation: string; version: string }>;
  /** Monthly statement as the agent has it now. */
  statement: Statement;
  run: boolean;
  failingPrompts: boolean;
}

export const workflowsScene = (): WorkflowsScene => ({ admissions: [], changes: [], statement: { ...record }, run: false, failingPrompts: false });

/** The boundaries exercised by Workflows, with one current definition, removed history and an agent-run receipt. */
export function workflowRoutes(world: WorkflowsScene): Route[] {
  return [
    (request, url) => {
      if (request.method !== "GET") return;
      switch (url.pathname) {
        case "/api/workflow/status": return Response.json({
          engine: "eliza-typed", status: "ready", manualSubmissionProtocol: 1, lifecycleMutationProtocol: 1,
          typedAuthoringProtocol: 1, typedScheduleProtocol: 1, metadataMutationProtocol: 1, approvalReceiptProtocol: 1,
        });
        case "/api/triggers": return world.failingPrompts ? Response.json({}, { status: 503 }) : Response.json({
          triggers: [{
            id: "desk-check", displayName: "Desk check", instructions: "", enabled: true, revision: 1,
            triggerType: "cron", cronExpression: "0 9 * * *", timezone: "UTC",
          }],
        });
        case "/api/scheduled-tasks": return Response.json({ tasks: [] });
        case "/api/workflow/workflows": return Response.json({ workflows: world.statement.removed ? [] : [world.statement] });
        case "/api/workflow/removed-workflows": return Response.json({ workflows: world.statement.removed ? [world.statement, removed] : [removed] });
        case `/api/workflow/workflows/${record.id}`: return Response.json(world.statement);
        case `/api/workflow/workflows/${removed.id}`: return Response.json(removed);
        case `/api/workflow/workflows/${record.id}/executions`: return Response.json({ executions: world.run ? [receipt] : [] });
        case `/api/workflow/workflows/${removed.id}/executions`: return Response.json({ executions: [] });
        case `/api/workflow/executions/${receipt.id}`: return Response.json({ execution: receipt });
      }
    },
    (request, url) => {
      if (request.method !== "POST" || url.pathname !== `/api/workflow/workflows/${record.id}/run`) return;
      return readJsonBody(request).then((body) => {
        if (typeof body.submissionId !== "string" || body.expectedVersionId !== world.statement.versionId || world.statement.removed) return Response.json({}, { status: 409 });
        world.admissions.push({ submission: body.submissionId, version: body.expectedVersionId });
        world.run = true;
        return Response.json({ submissionId: body.submissionId, execution: receipt });
      });
    },
    (request, url) => {
      if (request.method !== "POST" || url.pathname !== `/api/workflow/workflows/${record.id}/lifecycle`) return;
      return readJsonBody(request).then((body) => {
        const { mutationId, expectedVersionId, operation } = body;
        if (typeof mutationId !== "string" || (operation !== "remove" && operation !== "restore")) return Response.json({}, { status: 400 });
        const before = world.statement;
        if (expectedVersionId !== before.versionId || (operation === "remove") === before.removed) {
          return Response.json({ code: "WORKFLOW_LIFECYCLE_NOT_APPLIED", workflowId: record.id, mutationId, expectedVersionId }, { status: 409 });
        }
        const versionId = `${record.id}-v${4 + world.changes.length}`;
        world.changes.push({ operation, version: expectedVersionId });
        world.statement = operation === "remove"
          ? { ...before, versionId, active: false, removed: true, triggerCleanup: "complete" }
          : { ...record, versionId, active: false, removed: false };
        return Response.json({
          mutationId,
          receipt: { workflowId: record.id, previousVersionId: expectedVersionId, mutationId, operation, versionId, appliedAt: "2026-11-24T08:00:00.000Z" },
        });
      });
    },
  ];
}
