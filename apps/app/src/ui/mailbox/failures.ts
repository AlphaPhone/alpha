/**
 * What the owner is told about a failed Gmail request and an account disconnect, in Inbox and
 * Settings. The protocol-error reading, attachment refusal and the disconnect request itself stay
 * upstream (`@elizaos/plugin-inbox/mailbox/failures`); Alpha owns the classification and its text.
 */
import {
  attachmentRefused,
  type GmailDisconnectOutcome,
  protocolFailure,
} from "@elizaos/plugin-inbox/mailbox/failures";

/**
 * `refused` is this client's own refusal of an attachment's bytes, name or
 * size: Gmail answered, and a retry would get the same file. `gone` is a
 * message or draft Gmail no longer has: close it and refresh the list.
 * `rejected` is Cloud refusing the request itself (HTTP 400 or 413 without a
 * known code). Cloud's reason text is never shown.
 */
export type GmailFailureKind =
  | "offline"
  | "revoked"
  | "stale"
  | "gone"
  | "unavailable"
  | "refused"
  | "rejected";

export interface GmailFailure {
  kind: GmailFailureKind;
  message: string;
}

const messages: Record<
  GmailFailureKind,
  Record<"read" | "operation", string>
> = {
  offline: {
    read: "You appear to be offline. Gmail was not reached. Retry when you are connected.",
    // A request may have reached Gmail before the connection dropped, so this does not claim no change.
    operation:
      "You appear to be offline. Gmail may not have received this change. When you are connected, check the saved receipt before trying again.",
  },
  revoked: {
    read: "Gmail access was revoked or needs authorization again. Reconnect Gmail, then retry.",
    operation:
      "Gmail no longer allows this change for the selected account. Reconnect Gmail, then retry. Nothing was changed.",
  },
  stale: {
    read: "This message changed in Gmail. Retry to load its current version.",
    operation:
      "This message changed in Gmail since it was loaded. Retry to reload it; nothing was changed.",
  },
  gone: {
    read: "This message is no longer in Gmail. Refresh the list.",
    operation:
      "This message or draft is no longer in Gmail. Refresh the list; nothing was changed.",
  },
  refused: {
    read: "This attachment does not match its type or is too large. It was not opened or saved.",
    operation:
      "An attachment does not match its type or is too large, so this review was refused. Nothing was sent or changed.",
  },
  // A 400 can come at dispatch, so the operation sentence does not claim nothing was sent.
  rejected: {
    read: "Gmail refused this request.",
    operation: "Gmail refused this change. Check the review and try again.",
  },
  unavailable: {
    read: "Gmail is unavailable right now. Retry, or check the connection.",
    operation:
      "Mail operation unavailable. Check its receipt before trying again.",
  },
};

function online(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

/** Cloud error-body codes and the failure each one means, in reads and operations alike. */
const reasonKinds: Record<string, GmailFailureKind> = {
  reauth_required: "revoked",
  stale_revision: "stale",
  not_found: "gone",
};

/**
 * Classifies a failed Gmail request. The Cloud error code decides when the
 * response has one. Without it (older Cloud), reads and reviewed operations
 * interpret HTTP 409 differently: the managed read routes use 409 for a grant
 * that needs authorization again, while operation review uses it for a
 * message or draft that changed after it was loaded.
 */
export function classifyGmailFailure(
  error: unknown,
  context: "read" | "operation",
  isOnline = online(),
): GmailFailure {
  const result = (kind: GmailFailureKind): GmailFailure => ({
    kind,
    message: messages[kind][context],
  });
  // A refusal is decided on this device from bytes already received, so it holds offline too.
  if (attachmentRefused(error)) return result("refused");
  if (!isOnline) return result("offline");
  const failure = protocolFailure(error);
  if (failure) {
    if (failure.code !== "http") return result("unavailable");
    // Own keys only: a code such as "constructor" is not a known reason.
    const known =
      failure.reason && Object.hasOwn(reasonKinds, failure.reason)
        ? reasonKinds[failure.reason]
        : undefined;
    if (known) return result(known);
    const status = failure.status;
    if (status === 403 || status === 404) return result("revoked");
    if (status === 409) return result(context === "read" ? "revoked" : "stale");
    // Cloud's own reason text is the server's English, not Alpha's; the kind is worded here.
    if (status === 400 || status === 413) return result("rejected");
    return result("unavailable");
  }
  // Transport failures only; a TypeError from a programming fault is not reported as offline.
  if (
    error instanceof Error &&
    /network|offline|timed out|failed to fetch|load failed|internet/i.test(
      error.message,
    )
  )
    return result("offline");
  return result("unavailable");
}

export function disconnectMessage(
  outcome: GmailDisconnectOutcome,
  label: string,
): string {
  if (outcome === "disconnected")
    return `${label} is disconnected. Cloud no longer holds its Gmail access. No mail was deleted; local drafts stay on this phone until you discard them. Google may still list the app in your Google Account permissions.`;
  if (outcome === "still-connected")
    return `Disconnect was requested, but Gmail still reports ${label} as connected. Check the connection again.`;
  return `Disconnect of ${label} was not confirmed. Check the connection to see its current state before trying again.`;
}
