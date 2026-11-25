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

const approvalNode = "preview";
const approvalDigest = "a".repeat(64);
const executionPath = `/api/workflow/executions/${receipt.id}`;

export interface WorkflowsScene {
  readonly admissions: Array<{ submission: string; version: string }>;
  readonly decisions: Array<{ version: string; digest: string; approved: boolean }>;
  run: boolean;
  stage: "Running" | "Waiting" | "Done";
  receiptReads: number;
  approvalTitle: string;
  failingPrompts: boolean;
}

export const workflowsScene = (): WorkflowsScene => ({
  admissions: [], decisions: [], run: false, stage: "Done", receiptReads: 0, approvalTitle: "Review the statement preview", failingPrompts: false,
});

function execution(world: WorkflowsScene) {
  return {
    ...receipt,
    finished: world.stage === "Done",
    status: world.stage === "Done" ? "finished" : world.stage === "Waiting" ? "waiting-approval" : "running",
    output: world.stage === "Done" ? receipt.output : "",
  };
}

function review(world: WorkflowsScene) {
  return {
    runId: receipt.id, workflowId: record.id, workflowVersionId: record.versionId,
    finished: world.stage === "Done", cancellationRequested: false,
    approvals: [{
      runId: receipt.id, workflowId: record.id, workflowVersionId: record.versionId,
      nodeId: approvalNode, iteration: 0, requestDigest: approvalDigest,
      status: world.stage === "Done" ? "approved" : "pending", expiresAt: 60_000,
      title: world.approvalTitle, operation: "Show preview", summary: "Review this month's statement preview.",
      target: "Monthly statement", account: "This phone", supported: true,
    }],
  };
}

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
        case "/api/workflow/workflows": return Response.json({ workflows: [record] });
        case "/api/workflow/removed-workflows": return Response.json({ workflows: [removed] });
        case `/api/workflow/workflows/${record.id}`: return Response.json(record);
        case `/api/workflow/workflows/${removed.id}`: return Response.json(removed);
        case `/api/workflow/workflows/${record.id}/executions`: return Response.json({ executions: world.run ? [execution(world)] : [] });
        case `/api/workflow/workflows/${removed.id}/executions`: return Response.json({ executions: [] });
        case executionPath:
          world.receiptReads += 1;
          return Response.json({ execution: execution(world) });
        case `${executionPath}/approvals`: return Response.json(review(world));
      }
    },
    (request, url) => {
      if (request.method !== "POST") return;
      if (url.pathname === `${executionPath}/approvals/${approvalNode}/0`) {
        return readJsonBody(request).then((body) => {
          if (world.stage !== "Waiting" || body.expectedVersionId !== record.versionId || body.requestDigest !== approvalDigest || body.approved !== true) {
            return Response.json({}, { status: 409 });
          }
          world.decisions.push({ version: body.expectedVersionId, digest: body.requestDigest, approved: body.approved });
          world.stage = "Done";
          return Response.json(review(world), { status: 202 });
        });
      }
      if (url.pathname !== `/api/workflow/workflows/${record.id}/run`) return;
      return readJsonBody(request).then((body) => {
        if (typeof body.submissionId !== "string" || body.expectedVersionId !== record.versionId) return Response.json({}, { status: 409 });
        world.admissions.push({ submission: body.submissionId, version: body.expectedVersionId });
        world.run = true;
        return Response.json({ submissionId: body.submissionId, execution: execution(world) });
      });
    },
  ];
}
