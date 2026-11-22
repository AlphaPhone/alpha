// spec/inbox/failures.md, "A failure is classified by its cause, in a fixed order"; spec/inbox/notices.md, "The watch's status says what it can promise, from the native side's own report"
import type { FailureKind } from "../../../gen/inbox__failures.ts";
import type { BackgroundStatus, AskFailure } from "../../../gen/inbox__notices.ts";
import type { Admission, HandoffOutcome } from "../../../gen/inbox__attachments.ts";
import type { Folder } from "../../../gen/inbox__mailbox.ts";
import type { OpKind } from "../../../gen/inbox__operations.ts";
import type { ComposerRefusal } from "../../inbox/composer.vibe";
import type { OperationOutcome } from "../../inbox/operations.vibe";
import type { AttachmentRefusal } from "../../inbox/reader.vibe";

/** What a failed read tells the owner. */
export const readFailure: Record<FailureKind, string> = {
  NoFailure: "",
  Offline: "You appear to be offline. Gmail was not reached.",
  Revoked: "Gmail access needs authorization again.",
  Stale: "This message changed in Gmail.",
  Gone: "This message is no longer in Gmail.",
  Refused: "This attachment doesn't match its type or is too large.",
  Rejected: "Gmail refused this request.",
  Unavailable: "Gmail is unavailable right now.",
};

/** The folder names. */
export const folderNames: Record<Folder, string> = {
  InboxFolder: "Inbox", SentFolder: "Sent", DraftsFolder: "Drafts", ArchiveFolder: "Archive", StarredFolder: "Starred",
  AllFolder: "All mail", TrashFolder: "Trash", SpamFolder: "Spam",
};

/** An empty folder or search. */
export const emptyFolder: Record<Folder, string> = {
  InboxFolder: "Your Inbox is empty", SentFolder: "No sent messages", DraftsFolder: "No drafts", ArchiveFolder: "No archived messages",
  StarredFolder: "No starred messages", AllFolder: "No messages", TrashFolder: "Trash is empty", SpamFolder: "No spam",
};

/** The notice for a list cut from a changed mailbox. */
export const newerMail = "Newer mail arrived while this list was loading. Load newer mail to read it again.";

/** What a composer refusal tells the owner. */
export const composerRefusal: Record<ComposerRefusal, string> = {
  "no-account": "Connect a Gmail account first.",
  "drafts-full": "Local drafts are full. Delete one in Drafts first.",
  changed: "The saved draft changed. Reload before continuing.",
  "no-reply-address": "This message has no reply address.",
  "unclear-recipient": "A recipient is unclear. Check the addresses.",
  "not-movable": "Replies, forwards and Gmail drafts stay with the account they came from.",
  "destination-busy": "That account already has an open draft.",
  "edit-in-gmail": "Edit in Gmail",
  "gmail-draft-changed": "Gmail draft changed outside this app. Open Gmail to inspect it.",
  admission: "These attachments can't be sent together.",
  "name-or-encoding": "This file's name or encoding can't be attached. Rename it or choose another file.",
  "too-large": "This file is larger than 5 MiB. Choose a file up to 5 MiB.",
  "unsupported-type": "Attach a PDF, PNG, JPEG, WebP or UTF-8 TXT file up to 5 MiB.",
  "file-changed": "The selected file changed. Select it again.",
  "account-changed": "The email account changed. Nothing was added.",
  duplicate: "This file is already attached.",
  "not-ready": "Wait for drafts to load.",
  "too-long": "The draft would be too long. Nothing was added.",
};

/** What an attachment admission refusal tells the owner. */
export const admissionRefusal: Record<Admission, string> = {
  Admitted: "",
  TooManyFiles: "This account accepts no more attachments on this email.",
  DuplicateName: "Two attachments have the same name. Rename one to attach both.",
  TooManyBytes: "Attachments are over the total size this account accepts.",
  FileTooLarge: "This file is larger than 5 MiB.",
};

/** What a shared file's outcome tells the owner. */
export const handoffOutcome: Record<HandoffOutcome, string> = {
  FileAdded: "Selected file added to a new email. Nothing has been sent.",
  AccountChanged: "The email account changed. Nothing was added.",
  NotReady: "Open Inbox to refresh the account first. Nothing was added.",
  FileChanged: "The selected file changed. Select it again.",
  DraftsFull: "Local drafts are full. Delete one in Inbox, then share again. Nothing was added.",
  AlreadyAttached: "This file is already attached to your unfinished email. Nothing was added.",
};

/** What an operation's outcome tells the owner. */
export const operationOutcome: Record<OperationOutcome, string> = {
  Sent: "Sent.",
  Changed: "Done.",
  Rejected: "Gmail rejected this.",
  Uncertain: "The outcome is unknown. Check the saved receipt; don't repeat it.",
  NotStarted: "Gmail reports this was not started. A late request could still arrive.",
  Unsent: "Nothing was sent.",
  Refused: "This account has not allowed this change. Nothing was changed.",
  Discarded: "The email changed after review, so the review was discarded. Nothing was sent.",
  SignedOut: "Sign-in expired. Sign in again, then check the review.",
};

/** A review sheet's title by kind. */
export const reviewTitle: Record<OpKind, string> = {
  SendKind: "Send email", DraftCreateKind: "Save Gmail draft", DraftReplaceKind: "Replace Gmail draft", DraftDeleteKind: "Delete Gmail draft",
  ArchiveKind: "Archive message", UnarchiveKind: "Restore to Inbox", TrashKind: "Move to Trash", UntrashKind: "Restore from Trash",
  StarKind: "Star message", UnstarKind: "Remove star", MarkReadKind: "Mark read", MarkUnreadKind: "Mark unread",
};

/** What an attachment refusal tells the owner. */
export const attachmentRefusal: Record<AttachmentRefusal, string> = {
  "refresh-first": "Refresh first",
  "open-in-gmail": "Open in Gmail",
  changed: "Attachment changed",
  refused: "This attachment doesn't match its type or is too large.",
  failed: "Couldn't open",
};

/** What the background watch's status says. */
export function backgroundMessage(status: BackgroundStatus, lastCheck: number, notificationsAllowed: boolean, uncertain: number): string {
  const checked = lastCheck > 0 ? ` Last check: ${new Date(lastCheck).toLocaleString()}.` : " No background check yet.";
  const suffix = `${checked} Android may delay checks in battery saver.`;
  switch (status) {
    case "WebUnavailable": return "Background Gmail notices are available in the Android app.";
    case "BackgroundDisabled": return "Select a connected Gmail account to enable background checks.";
    case "BackgroundUnsupported": return `Background Gmail is unavailable on this server.${checked}`;
    case "GrantUnavailable": return "Background checks need the matching sign-in and Gmail read access.";
    case "CapacityReached": return "Gmail notice history is full. Open Inbox to review current mail.";
    case "BackgroundRetrying": case "BackgroundUnavailable": return `Background checks are waiting to retry.${suffix}`;
    default: {
      const phase = status === "HistoryExpired" ? "Gmail history expired; earlier missed messages were not checked." : status === "CatchingUp" ? "Gmail changes are still being checked." : "Watching for new unread Inbox mail.";
      return `${phase}${notificationsAllowed ? "" : " Notifications are off."}${uncertain > 0 ? " Some notices have unknown outcomes and won't be repeated." : ""}${suffix}`;
    }
  }
}

/** What a failed Ask tells the owner. */
export const askFailure: Record<AskFailure, string> = {
  NoAskFailure: "",
  ChangedNotice: "The notification changed. Nothing was asked.",
  CouldNotKeep: "The question could not be kept.",
};

/** The placeholder shown for a remote image that was not loaded. */
export const imagePlaceholder = (alt: string) => (alt ? `[Image: ${alt}]` : "[Image]");
