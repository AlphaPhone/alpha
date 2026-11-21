/**
 * What the owner is told after a read-state change. The reviewed dispatch and the in-flight guard
 * stay upstream (`@elizaos/plugin-inbox/mailbox/read-state`).
 */
import type { MailReadStateOutcome } from "@elizaos/plugin-inbox/mailbox/read-state";

/**
 * What to tell the owner after an explicit change. `failure` classifies a
 * failed request (for example `classifyGmailFailure(error, "operation")`).
 * Automatic changes stay silent.
 */
export function mailReadStateMessage(
  outcome: MailReadStateOutcome,
  unread: boolean,
  failure: (error: unknown) => string,
): string | null {
  switch (outcome.status) {
    case "busy":
      return "A read-state change for this message is still in progress.";
    case "skipped":
      return null;
    case "unconfirmed":
      return "Read state was not confirmed. Refresh to check it before trying again.";
    case "failed":
      return failure(outcome.error);
    case "changed":
      return unread ? "Marked unread in Gmail" : "Marked read in Gmail";
  }
}
