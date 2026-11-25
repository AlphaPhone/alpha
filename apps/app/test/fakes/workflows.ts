import type { DigestResult } from "@elizaos/plugin-workflow-client";
import type { NativeDigestSnapshot } from "../../src/platform/hosted-digests.vibe";
import { type Faked, rejection } from "./phone.ts";
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

type PromptTiming =
  | { triggerType: "once"; scheduledAtIso: string }
  | { triggerType: "cron"; cronExpression: string }
  | { triggerType: "event"; eventKind: string };

type Prompt = PromptTiming & {
  id: string;
  displayName: string;
  instructions: string;
  enabled: boolean;
  revision: number;
  timezone: string;
};

export interface NativeDigestScene {
  snapshot: NativeDigestSnapshot;
  incoming: readonly DigestResult[] | undefined;
  readonly manualLeases: string[];
}

// spec/app/digests/index.md, "Android supplies one verified view of retained results and background checks"
export const alphaHostedDigests = (native: NativeDigestScene): Faked => (emit) => ({
  read: () => Promise.resolve({ snapshot: native.snapshot }),
  peekNotice: () => Promise.resolve({ notice: null }),
  async syncManual({ lease }: { lease: string }) {
    if (lease !== native.snapshot.lease) throw rejection("Digest lease changed");
    native.manualLeases.push(lease);
    if (native.incoming !== undefined) {
      native.snapshot = { ...native.snapshot, rows: native.incoming };
      native.incoming = undefined;
      emit("changed", {});
    }
  },
});

export interface WorkflowsScene {
  readonly prompts: Map<string, Prompt>;
  readonly promptEdits: Record<string, unknown>[];
  readonly admissions: Array<{ submission: string; version: string }>;
  readonly decisions: Array<{ version: string; digest: string; approved: boolean }>;
  run: boolean;
  stage: "Running" | "Waiting" | "Done";
  receiptReads: number;
  approvalTitle: string;
  failingPrompts: boolean;
  hosted?: { entries: DigestResult[]; reads: number; acknowledgements: string[] };
  nativeDigests?: NativeDigestScene;
}

export const workflowsScene = (): WorkflowsScene => ({
  prompts: new Map([["desk-check", {
    id: "desk-check", displayName: "Desk check", instructions: "Check the desk", enabled: true, revision: 1,
    triggerType: "cron", cronExpression: "0 9 * * *", timezone: "UTC",
  }]]),
  promptEdits: [],
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
      const prompt = world.prompts.get(url.pathname.slice("/api/triggers/".length));
      if (url.pathname.startsWith("/api/triggers/") && prompt !== undefined) return Response.json({ trigger: prompt });
      switch (url.pathname) {
        case "/api/workflow/status": return Response.json({
          engine: "eliza-typed", status: "ready", manualSubmissionProtocol: 1, lifecycleMutationProtocol: 1,
          typedAuthoringProtocol: 1, typedScheduleProtocol: 1, metadataMutationProtocol: 1, approvalReceiptProtocol: 1,
          ...(world.hosted === undefined ? {} : { hostedDigestProtocol: 1 }),
        });
        case "/api/workflow/hosted/loops": return world.hosted && Response.json({ loops: [] });
        case "/api/workflow/hosted/sources": return world.hosted && Response.json({ sources: [] });
        case "/api/workflow/hosted/results": {
          if (world.hosted === undefined) return;
          world.hosted.reads += 1;
          return Response.json({ entries: world.hosted.entries.filter((row) => !world.hosted?.acknowledgements.includes(row.runId)) });
        }
        case "/api/triggers": return world.failingPrompts ? Response.json({}, { status: 503 }) : Response.json({ triggers: [...world.prompts.values()] });
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
      if (request.method !== "PUT" || !url.pathname.startsWith("/api/triggers/")) return;
      const id = url.pathname.slice("/api/triggers/".length);
      const current = world.prompts.get(id);
      if (!current) return Response.json({}, { status: 404 });
      return readJsonBody(request).then((body) => {
        world.promptEdits.push(body);
        if (current.revision !== body.expectedRevision) return Response.json({}, { status: 409 });
        if (typeof body.enabled === "boolean" && Object.keys(body).length === 2) {
          const trigger = { ...current, enabled: body.enabled, revision: current.revision + 1 };
          world.prompts.set(id, trigger);
          return Response.json({ trigger });
        }
        const timing: PromptTiming | undefined =
          body.triggerType === "once" && typeof body.scheduledAtIso === "string" ? { triggerType: "once", scheduledAtIso: body.scheduledAtIso }
            : body.triggerType === "cron" && typeof body.cronExpression === "string" ? { triggerType: "cron", cronExpression: body.cronExpression }
              : body.triggerType === "event" && typeof body.eventKind === "string" ? { triggerType: "event", eventKind: body.eventKind }
                : undefined;
        if (!timing || typeof body.displayName !== "string" || typeof body.instructions !== "string" || typeof body.timezone !== "string") {
          return Response.json({}, { status: 400 });
        }
        const trigger = {
          id, displayName: body.displayName, instructions: body.instructions, timezone: body.timezone,
          enabled: current.enabled, revision: current.revision + 1, ...timing,
        };
        world.prompts.set(id, trigger);
        return Response.json({ trigger });
      });
    },
    (request, url) => {
      if (request.method !== "POST") return;
      if (url.pathname === "/api/workflow/hosted/results/ack" && world.hosted !== undefined) {
        const hosted = world.hosted;
        return readJsonBody(request).then((body) => {
          const result = hosted.entries.find((row) => row.runId === body.runId && row.cursor === body.cursor);
          if (result === undefined || typeof body.clientId !== "string") return Response.json({}, { status: 404 });
          hosted.acknowledgements.push(result.runId);
          return Response.json({ acknowledged: result.cursor });
        });
      }
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
