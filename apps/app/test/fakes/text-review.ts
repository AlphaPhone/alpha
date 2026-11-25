import type { DeviceOperation, JournalEntry } from "@elizaos/agent";
import { type Faked, plugin } from "./phone.ts";
import { readJsonBody, type Route } from "./routes.ts";

const enrollmentId = "this-phones-enrollment";
const key = "a".repeat(64);
const attemptId = "device-attempt-1";

type Sms = Extract<DeviceOperation, { type: "sms_send" }>;
type ReviewOperation = Extract<DeviceOperation, { type: "sms_send" | "sms_compose" | "sms_latest_sender" | "messages_read_selected" | "voicemail_read_selected" | "files_filter" | "files_open" | "files_move" | "files_share" | "files_trash" | "files_folder_create" | "browser_navigate" | "browser_tabs_show" }>;
interface ReadOrigin { readonly version: 1; readonly requestId: string; readonly conversationId: string; readonly inReplyTo: string }

type Confirmation = Pick<Sms, "recipients" | "body" | "subscriptionId"> & { operationId: string; confirm(): void };

export function textReview(agentId: string, id: string, operation: ReviewOperation, requestMessageId?: string) {
  return {
    agentId,
    proposal: {
      id, digest: "b".repeat(64), state: "pending", expiresAt: new Date(Date.now() + 60_000).toISOString(),
      payload: { installationId: agentId, enrollmentId, operation, requestMessageId },
    },
    pendingReads: 0,
    readOrigin: undefined as ReadOrigin | undefined,
    senderReads: [] as boolean[],
    completions: [] as unknown[],
    journal: new Map<string, JournalEntry>(),
    confirmations: [] as Confirmation[],
    decisions: [] as string[],
    declines: [] as string[],
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
export function textReviewRoute(review: TextReviewScene, subjectUserId: string): Route {
  const { agentId, proposal } = review;
  const operation = proposal.payload.operation;
  const files = ["files.browser.v1", "files.shown-target.v1"];
  const browser = ["browser.open-new-tab.v1", "browser.tabs.show.v1"];
  const capabilities = {
    sms_send: ["sms.send.v1"],
    sms_compose: ["sms.compose.v1", "sms.compose.v2"],
    sms_latest_sender: ["includeAddress" in operation ? "sms.latest-sender.v2" : "sms.latest-sender.v1"],
    messages_read_selected: ["messages.read.v1"],
    voicemail_read_selected: ["voicemail.read.v1"],
    files_filter: files,
    files_open: files,
    files_move: files,
    files_share: files,
    files_trash: files,
    files_folder_create: files,
    browser_navigate: browser,
    browser_tabs_show: browser,
  }[operation.type];
  const prefix = "/api/client-devices/";
  const reject = (status: number) => Response.json({ error: "review refused" }, { status });
  return (request, url) => {
    const path = url.pathname;
    if (!path.startsWith(prefix)) return undefined;
    const resource = path.slice(prefix.length);
    if (request.method === "GET" && resource === "capabilities") {
      return Response.json({ protocol: 1, agentId, identityId: subjectUserId, deviceActions: { protocol: 1, capabilities } });
    }
    if (request.headers.get("x-eliza-device-id") !== agentId || request.headers.get("x-eliza-device-key") !== key
      || request.headers.get("x-eliza-device-capabilities") !== capabilities.join(",")) return reject(401);
    if (request.method === "GET" && resource === "context") {
      return Response.json({ agentId, installationId: agentId, enrollmentId, subjectUserId });
    }
    if (request.method === "GET" && resource === "proposals") {
      review.pendingReads += 1;
      return Response.json({ proposals: [{ ...proposal, ...(review.readOrigin === undefined ? {} : { readReplyOrigin: review.readOrigin }) }] });
    }
    if (request.method !== "POST" || !resource.startsWith(`proposals/${proposal.id}/`)) return reject(404);
    const step = resource.split("/").at(-1);
    return readJsonBody(request).then((body) => {
      if (body.digest !== proposal.digest) return reject(409);
      if (step === "decision" && proposal.state === "pending" && body.decision === "reject") {
        review.declines.push(proposal.id);
        proposal.state = "rejected";
        return Response.json({ digest: proposal.digest, proposal });
      }
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
      const origin = review.readOrigin;
      if (step === "read-completion" && proposal.state === "done" && origin !== undefined && body.version === origin.version
        && body.proposalId === proposal.id && body.attemptId === attemptId && body.requestId === origin.requestId
        && body.conversationId === origin.conversationId && body.inReplyTo === origin.inReplyTo
        && review.journal.get(proposal.id)?.acknowledged === true) {
        review.completions.push(body);
        return Response.json({ reply: { ...origin, messageId: `${proposal.id}-answer`, text: "The reviewed read answered the original request." } });
      }
      return reject(409);
    });
  };
}
