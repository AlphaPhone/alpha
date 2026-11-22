// States the Inbox components reach, for their stories (`*.meta.tsx`).
import { initial as mailboxInitial, type Mailbox, type MailRow } from "../../../gen/inbox__mailbox.ts";
import { emptyBody, initial as readerInitial, type Reader } from "../../../gen/inbox__reader.ts";
import { initial as selectionInitial, type Selection } from "../../../gen/inbox__selection.ts";
import { emptyFields, noDraft, type AccountDrafts, type Draft } from "../../../gen/inbox__drafts.ts";
import { noRecord, noReview, noReceipt, type OperationRecord } from "../../../gen/inbox__operations.ts";
import type { MailAccount } from "../../../gen/inbox__accounts.ts";
import { initial as noticesInitial, type MailNotices } from "../../../gen/inbox__notices.ts";
import type { EmailCard } from "../../../gen/inbox__agentDrafts.ts";

const row = (id: string, sender: string, subject: string, snippet: string, unread: boolean): MailRow => ({
  id, threadId: `t-${id}`, sender, senderAddress: `${sender.toLowerCase()}@example.com`, subject, snippet, receivedAt: "2026-11-21T09:30:00Z", unread, starred: false, attached: false,
});

/** A work account allowed to read and change mail. */
export const workAccount: MailAccount = { id: "grant-work", label: "ann@example.com", address: "ann@example.com", connected: true, capabilities: ["CapIdentity", "CapTriage", "CapSend", "CapDrafts", "CapMailbox"] };

/** An inbox read for the work account, with more pages beyond it. */
export const inboxList: Mailbox = {
  ...mailboxInitial, account: workAccount.id, epoch: 1, generation: 2, phase: "ListReady", cursor: "p1", seen: ["p1"], firstRevision: "41",
  rows: [row("m1", "Bo", "Lunch Friday", "Noon works for me", true), row("m2", "Cy", "Invoice 42", "Attached is the invoice", false)],
};

/** The same inbox after a later page came from a changed mailbox. */
export const shiftedList: Mailbox = { ...inboxList, newerMail: true };

/** A saved list shown before the first read. */
export const savedList: Mailbox = { ...inboxList, cached: true };

/** A failed read that keeps the list. */
export const failedList: Mailbox = { ...inboxList, phase: "ListFailed", failure: "Offline" };

/** No selection. */
export const notSelecting: Selection = selectionInitial;

/** Two messages picked. */
export const picking: Selection = { ...selectionInitial, scope: "s", phase: "Selecting", picked: [{ id: "m1", version: "" }] };

/** A message read whole. */
export const openMessage: Reader = {
  ...readerInitial, account: workAccount.id, visit: 3, phase: "BodyShown",
  body: {
    ...emptyBody, id: "m1", threadId: "t-m1", sender: "Bo", senderAddress: "bo@example.com", recipients: ["ann@example.com"], subject: "Lunch Friday",
    snippet: "Noon works for me", text: "Noon works for me. See you at the usual place.\n\nBo", historyId: "h7", unread: false,
    parts: [{ partId: "1", name: "menu.pdf", mimeType: "application/pdf", bytes: 48213, supported: true }],
    links: [{ href: "https://example.com/menu", text: "example.com/menu", host: "example.com", mismatch: false }],
  },
};

/** The same message while it loads. */
export const loadingMessage: Reader = { ...openMessage, phase: "BodyLoading" };

/** A new email in the composer. */
export const draft: Draft = { ...noDraft, id: "d1", revision: 2, fields: { ...emptyFields, toList: ["bo@example.com"], subject: "Friday", body: "Sounds good." } };

/** The work account's drafts: the open one and one set aside. */
export const workDrafts: AccountDrafts = {
  owner: "o", open: draft, composing: true,
  shelf: [{ ...noDraft, id: "d0", revision: 1, fields: { ...emptyFields, subject: "Quarterly plan", body: "First notes" } }, { ...draft, id: "d9", earlier: true }],
};

/** A send waiting for confirmation. */
export const sendReview: OperationRecord = {
  ...noRecord, owner: "o", requestId: "r1", kind: "SendKind", phase: "Reviewing",
  proposal: { tag: "MessageProposal", mail: { mode: "ComposeMail", toList: ["bo@example.com"], ccList: [], bccList: [], subject: "Friday", body: "Sounds good.", files: [], forwardMessage: "", forwardHistory: "", forwardParts: [], replyMessage: "" }, draftId: "", expectedDigest: "" },
  review: { ...noReview, sender: "ann@example.com", toList: ["bo@example.com"], subject: "Friday" },
  receipt: { ...noReceipt, requestId: "r1", receiptKind: "SendKind", digest: "a".repeat(64), receiptState: "PreparedReceipt" },
  composer: { draftId: "d1", content: "{}" },
};

/** An archive whose outcome is unknown. */
export const unknownArchive: OperationRecord = {
  ...noRecord, owner: "o", requestId: "r2", kind: "ArchiveKind", phase: "Observed",
  proposal: { tag: "LabelProposal", messageId: "m1", expectedHistoryId: "h7" },
  receipt: { ...noReceipt, requestId: "r2", receiptKind: "ArchiveKind", digest: "b".repeat(64), receiptState: "UnknownReceipt" },
};

/** An Ask tap under review. */
export const askReview: MailNotices = {
  ...noticesInitial, available: true, tap: "ReviewingAsk", token: "t1", tapGrant: "grant-work", asks: true,
  excerpt: { message: "m1", thread: "t-m1", revision: "h7", subject: "Lunch Friday", snippet: "Noon works for me" },
};

/** An agent's email waiting in chat. */
export const agentCard: EmailCard = {
  messageId: "6f1f2a51-0d7a-4c3e-9e2b-6a7c2d1e9f00", conversation: "c1", grant: "grant-work", sender: "ann@example.com", recipients: ["bo@example.com"],
  literalTo: true, subject: "Friday", body: "Noon works for me.", phase: "CardDraft", revision: 1, version: 1,
};
