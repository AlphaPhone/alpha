import type { DeviceOperation, JournalEntry } from "@elizaos/agent";
import { type Faked, plugin } from "./phone.ts";
import { readJsonBody, type Route } from "./routes.ts";

const installationId = "agent-on-phone";
const enrollmentId = "this-phones-enrollment";
const key = "a".repeat(64);
const capability = "sms.send.v1";
const attemptId = "device-attempt-1";

type Sms = Extract<DeviceOperation, { type: "sms_send" }>;
type Confirmation = Pick<Sms, "recipients" | "body" | "subscriptionId"> & { operationId: string; confirm(): void };

export function textReview(owner: string, id: string, operation: Sms) {
  return {
    owner,
    proposal: {
      id, digest: "b".repeat(64), state: "pending", expiresAt: new Date(Date.now() + 60_000).toISOString(),
      payload: { installationId, enrollmentId, operation },
    },
    pendingReads: 0,
    journal: new Map<string, JournalEntry>(),
    confirmations: [] as Confirmation[],
    decisions: [] as string[],
    claims: [] as string[],
    receipts: [] as unknown[],
  };
}

export type TextReviewScene = ReturnType<typeof textReview>;

export const textReviewEnrollment: Faked = plugin<{
  enrollmentKey(input: { slot: string }): Promise<{ key: string }>;
  authority(): Promise<{ active: boolean }>;
}>(() => ({ enrollmentKey: () => Promise.resolve({ key }), authority: () => Promise.resolve({ active: true }) }));

/** The resident lists and settles only this enrolled phone's exact proposal. */
export function textReviewRoute(review: TextReviewScene): Route {
  const { proposal } = review;
  const prefix = "/api/client-devices/";
  const reject = (status: number) => Response.json({ error: "review refused" }, { status });
  return (request, url) => {
    const path = url.pathname;
    if (!path.startsWith(prefix)) return undefined;
    const resource = path.slice(prefix.length);
    if (request.method === "GET" && resource === "capabilities") {
      return Response.json({ agentId: installationId, identityId: review.owner, deviceActions: { protocol: 1, capabilities: [capability] } });
    }
    if (request.headers.get("x-eliza-device-id") !== installationId || request.headers.get("x-eliza-device-key") !== key
      || request.headers.get("x-eliza-device-capabilities") !== capability) return reject(401);
    if (request.method === "GET" && resource === "context") {
      return Response.json({ agentId: installationId, installationId, enrollmentId, subjectUserId: review.owner });
    }
    if (request.method === "GET" && resource === "proposals") {
      review.pendingReads += 1;
      return Response.json({ proposals: [proposal] });
    }
    if (request.method !== "POST" || !resource.startsWith(`proposals/${proposal.id}/`)) return reject(404);
    const step = resource.split("/").at(-1);
    return readJsonBody(request).then((body) => {
      if (body.digest !== proposal.digest) return reject(409);
      if (step === "decision" && proposal.state === "pending" && body.decision === "approve") {
        review.decisions.push(proposal.id);
        proposal.state = "approved";
        return Response.json({ digest: proposal.digest, proposal });
      }
      if (step === "claim" && proposal.state === "approved") {
        review.claims.push(proposal.id);
        proposal.state = "executing";
        return Response.json({ digest: proposal.digest, proposal: { ...proposal, execution: { attemptId } } });
      }
      if (step === "receipt" && proposal.state === "executing" && body.attemptId === attemptId) {
        review.receipts.push(body.receipt);
        proposal.state = "done";
        return Response.json({ digest: proposal.digest, proposal });
      }
      return reject(409);
    });
  };
}
