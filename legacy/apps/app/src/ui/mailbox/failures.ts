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
import { mailOperationRefusal } from "./mail-operation-messages";

/**
 * `refused` is this client's own refusal of an attachment's bytes, name or
 * size: Gmail answered, and a retry would get the same file. `gone` is a
 * message or draft Gmail no longer has: close it and refresh the list.
 * `rejected` is Cloud refusing the request itself (HTTP 400 or 413 without a
 * known code). Cloud's reason text is never shown: each refusal Cloud's Inbox
 * routes are known to send is worded by Alpha ({@link cloudInboxRefusal}).
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

/** A request this phone built that Cloud's Inbox routes could not accept; the owner cannot fix it. */
const REQUEST_NOT_ACCEPTED =
  "Gmail’s service could not accept this request from the phone.";

/**
 * Cloud's Inbox routes (`packages/cloud/api/v1/eliza/google/gmail/inbox-v1` and
 * `agent-google-connector/inbox-*.ts`) refuse a request with HTTP 400 or 413 and a fixed English
 * sentence in `error`. Each one is worded by Alpha here, keyed by Cloud's exact text, so the owner
 * still learns what to change. These do not claim nothing was sent: a 400 can come at dispatch.
 */
export const CLOUD_INBOX_REFUSALS: ReadonlyMap<string, string> = new Map([
  // Request shape: built by this phone, never typed by the owner.
  ["Explicit grant UUID required", REQUEST_NOT_ACCEPTED],
  ["A UUID identity is required", REQUEST_NOT_ACCEPTED],
  ["JSON body required", REQUEST_NOT_ACCEPTED],
  ["Invalid JSON", REQUEST_NOT_ACCEPTED],
  ["JSON object required", REQUEST_NOT_ACCEPTED],
  ["Unexpected or missing Inbox fields", REQUEST_NOT_ACCEPTED],
  ["Review digest required", REQUEST_NOT_ACCEPTED],
  ["Object required", REQUEST_NOT_ACCEPTED],
  ["Invalid provider identity", REQUEST_NOT_ACCEPTED],
  ["Unexpected mail field", REQUEST_NOT_ACCEPTED],
  ["Unsupported mail operation", REQUEST_NOT_ACCEPTED],
  ["Explicit compose mode required", REQUEST_NOT_ACCEPTED],
  ["Reply identity is not valid for this compose mode", REQUEST_NOT_ACCEPTED],
  ["Source attachments are valid only for a forward", REQUEST_NOT_ACCEPTED],
  ["Explicit source attachment parts required", REQUEST_NOT_ACCEPTED],
  ["Draft replacement fields are not valid for this operation", REQUEST_NOT_ACCEPTED],
  ["A continuation offset requires the reviewed thread history identity", REQUEST_NOT_ACCEPTED],
  // Recipients and text the owner wrote.
  ["Invalid recipient list", "Check the recipients. Each field takes at most 50 addresses."],
  ["At least one recipient is required to send", "Add at least one recipient before sending."],
  ["At most 50 recipients are supported", "Send to at most 50 recipients in all."],
  ["Use an unambiguous email address without a display name", "Enter each recipient as a plain email address, without a name."],
  ["Invalid mail text", "A subject, message or attachment name is too long or has a line break. Shorten it and try again."],
  ["Reply subject must match the selected message", "A reply’s subject must match the email you are replying to."],
  ["Inbox review exceeds the explicit size limit", "This email is too large to review."],
  // Attachments the owner chose.
  ["Supported attachments: PDF, PNG, JPEG, WebP and UTF-8 TXT", "Attach only PDF, PNG, JPEG, WebP or UTF-8 text files."],
  ["Invalid attachment encoding", "An attachment could not be read. Choose the file again."],
  ["Attachment must be UTF-8", "A text attachment must be UTF-8 text."],
  ["Attachment content does not match its type", "An attachment’s content does not match its file type."],
  ["Attachment names must be unique", "Two attachments have the same name. Rename one to attach both."],
  ["Attachments exceed 5 MiB in total", "Attachments are over 5 MiB in total."],
  // Drafts Alpha cannot edit without changing them.
  ["Draft has ambiguous headers; use the provider editor", "This draft has headers Alpha cannot edit safely. Open it in Gmail to edit it."],
  ["Draft has multiple body sections; use the provider editor", "This draft has more than one body section. Open it in Gmail to edit it."],
  ["Draft body requires the provider editor", "This draft’s text cannot be opened here. Open it in Gmail to edit it."],
  ["Draft body cannot be decoded losslessly; use the provider editor", "This draft’s text cannot be opened here without changing it. Open it in Gmail to edit it."],
  ["Encoded draft subject requires the provider editor", "This draft’s subject cannot be edited here. Open it in Gmail to edit it."],
  ["Draft body exceeds the explicit display limit", "This draft is too long to open here. Open it in Gmail."],
  ["Permanent provider draft deletion requires confirmation", "Confirm that the Gmail draft should be deleted permanently."],
  ["Gmail has no atomic draft compare-and-swap; explicit replacement acknowledgement required", "Confirm that the Gmail draft should be replaced."],
  ["Invalid Gmail page token", "The drafts list changed. Refresh it."],
  // Mail too large or too complex to open on this phone.
  ["Too many MIME parts", "This email has too many parts to open here. Open it in Gmail."],
  ["Provider result exceeds the explicit size limit", "Gmail’s answer was too large to open here."],
  ["Thread exceeds the explicit 2000-message support limit", "This conversation has more than 2,000 messages. Open it in Gmail."],
  ["Thread offset is outside the current snapshot", "This conversation changed. Reopen it."],
  ["Message body exceeds the explicit display limit", "This email is too long to open here. Open it in Gmail."],
  ["Message metadata exceeds the display limit", "This email’s headers are too large to open here. Open it in Gmail."],
  ["Attachments must be at most 5 MiB", "This attachment is larger than 5 MiB and cannot be opened here."],
  ["Supported PDF, image or TXT attachments must be at most 5 MiB", "Only PDF, image or text attachments up to 5 MiB can be forwarded or opened here."],
]);

/**
 * Alpha's sentence for Cloud's refusal text (`data.error` of a 400 or 413), or undefined when the
 * text is not one Cloud is known to send.
 */
export function cloudInboxRefusal(data: unknown): string | undefined {
  const text =
    data && typeof data === "object"
      ? (data as { error?: unknown }).error
      : undefined;
  if (typeof text !== "string") return undefined;
  const known = CLOUD_INBOX_REFUSALS.get(text);
  if (known) return known;
  const most = /^At most (\d+) attachments are supported$/.exec(text)?.[1];
  if (most) return `Attach at most ${most} files.`;
  // Sentences the shared mail journal also words (for example "Attachment exceeds 5 MiB").
  return mailOperationRefusal(text);
}

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
    // Cloud's own reason text is the server's English, not Alpha's: a known refusal keeps its
    // reason in Alpha's words, anything else is worded by its kind.
    if (status === 400 || status === 413) {
      const known = cloudInboxRefusal(failure.data);
      return known ? { kind: "rejected", message: known } : result("rejected");
    }
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
