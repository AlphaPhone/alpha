/**
 * What the mail review says when the shared Inbox operation journal and its Gmail review checks
 * (`plugins/plugin-inbox/src/mailbox/operation-journal.ts`, `read-state.ts`, `attachments.ts` and
 * `retained-draft.ts`) refuse with a plain sentence. Each one is worded by Alpha here and the
 * journal's text is never shown; anything else reads as the screen's fallback.
 */
import { reviewBindingRefusal } from "./review-binding-refusal";

const RELOAD_RECEIPT = "Reload the saved receipt before continuing.";

/** Field names the journal compares, in the owner's words. */
const REVIEWED_FIELDS: Readonly<Record<string, string>> = {
  kind: "kind of email",
  mode: "send mode",
  subject: "subject",
  bodyText: "message text",
  replyMessageId: "email being replied to",
  draftId: "draft",
  expectedDigest: "email",
  messageId: "email",
  expectedHistoryId: "mailbox state",
};

/** Keyed by every fixed sentence the journal and its checks throw. */
export const MAIL_OPERATION_REFUSALS: ReadonlyMap<string, string> = new Map([
  ...Object.values(reviewBindingRefusal).map((text) => [text, text] as [string, string]),
  [
    "The unsent review kept changing and was not discarded. Reload its receipt before continuing.",
    `The unsent review kept changing, so it wasn’t discarded. ${RELOAD_RECEIPT}`,
  ],
  ["An Inbox operation is already pending", "Another email action is still in progress. Wait for it to finish."],
  ["Inbox operation changed. Reload its receipt before continuing.", `This email action changed. ${RELOAD_RECEIPT}`],
  ["Invalid saved Inbox operation", "The saved email action can’t be read. Discard it to continue."],
  ["Review the saved operation before starting another.", "Review the saved email action before starting another."],
  ["Message exceeds the supported review size", "This email is too large to review."],
  ["Review recovery is unavailable", "The saved review can’t be recovered right now."],
  ["Server review does not match its receipt", "Gmail’s review didn’t match its receipt. Nothing was sent."],
  ["Server changed the reviewed recipients", "Gmail changed the recipients you reviewed. Nothing was sent."],
  ["Unsupported sender", "This sender isn’t supported. Nothing was sent."],
  ["Unsupported attachments", "These attachments aren’t supported. Nothing was sent."],
  ["This server cannot review more than one attachment", "This account can review only one attachment per email. Nothing was sent."],
  ["Server changed the reviewed attachments", "Gmail changed the attachments you reviewed. Nothing was sent."],
  ["Unsupported forwarded attachments", "These forwarded attachments aren’t supported. Nothing was sent."],
  ["Server changed the forwarded attachments", "Gmail changed the forwarded attachments. Nothing was sent."],
  ["Attachments exceed the reviewed total limit", "The attachments are larger than the reviewed total. Nothing was sent."],
  ["Server added forwarded attachments", "Gmail added forwarded attachments you didn’t review. Nothing was sent."],
  ["A fresh exact review is required", "Review this email again before sending. Nothing was sent."],
  [
    "Gmail answered for a different request, so nothing was confirmed. Check the saved receipt before trying again; do not send this message again.",
    "Gmail answered for a different request, so nothing was confirmed. Check the saved receipt before trying again; don’t send this email again.",
  ],
  ["No saved operation", "There’s no saved email action."],
  ["No attempted operation to discard", "There’s no unsent review to discard."],
  [
    "Outcome is unresolved. Check the existing receipt; do not repeat this message.",
    "Alpha doesn’t know yet whether this was sent. Check the saved receipt; don’t send it again.",
  ],
  ["Server review does not match the requested read state", "Gmail’s answer didn’t match the read state you asked for."],
  ["Unexpected read-state receipt", "Gmail’s read-state answer couldn’t be checked."],
  ["Retained email edits need recovery.", "Saved email edits need recovery."],
  ["This account accepts one attachment per email.", "This account accepts one attachment per email."],
  ["Two attachments have the same name.", "Two attachments have the same name. Rename one to attach both."],
  ["Invalid attachment name or encoding", "An attachment’s name or encoding can’t be sent. Rename it or choose another file."],
  ["Attachment exceeds 5 MiB", "An attachment is larger than 5 MiB."],
]);

/** Alpha's sentence for a journal refusal, or undefined when the text is not one of its sentences. */
export function mailOperationRefusal(message: string): string | undefined {
  const known = MAIL_OPERATION_REFUSALS.get(message);
  if (known) return known;
  const field = /^Server changed the requested (\w+)$/.exec(message)?.[1];
  if (field && Object.hasOwn(REVIEWED_FIELDS, field))
    return `Gmail changed the ${REVIEWED_FIELDS[field]} you reviewed. Nothing was sent.`;
  const total = /^Attachments exceed (\d+) MiB in total\.$/.exec(message)?.[1];
  if (total) return `Attachments are over ${total} MiB in total.`;
  const most = /^Attach at most (\d+) files\.$/.exec(message)?.[1];
  if (most) return `Attach at most ${most} files.`;
  return undefined;
}

/**
 * A refusal worded by Alpha's own mail review (for example a Gmail draft that changed outside
 * Alpha). Its message is shown as written; the shared journal never throws this class.
 */
export class MailReviewNotice extends Error {
  override name = "MailReviewNotice";
}

/**
 * Alpha's sentence for a failed mail operation: Alpha's own review notice as written, else the
 * journal sentence it names, else `fallback`. Other error text may come from shared code and is
 * never shown.
 */
export function mailOperationText(error: unknown, fallback: string): string {
  if (error instanceof MailReviewNotice && error.message.trim()) return error.message.trim();
  const message = error instanceof Error ? error.message.trim() : "";
  return mailOperationRefusal(message) ?? fallback;
}
