// States the Inbox components reach, for their stories (`*.meta.tsx`).
import { initial as mailboxInitial, type Mailbox, type MailRow } from "../../../gen/inbox__mailbox.ts";
import { emptyBody, initial as readerInitial, type Reader } from "../../../gen/inbox__reader.ts";
import { initial as selectionInitial, type Selection } from "../../../gen/inbox__selection.ts";
import { emptyFields, noDraft, type AccountDrafts, type Draft, type Drafts } from "../../../gen/inbox__drafts.ts";
import { initial as journalInitial, noRecord, noReview, noReceipt, type Journal, type OperationRecord } from "../../../gen/inbox__operations.ts";
import { initial as accountsInitial, type MailAccount, type MailAccounts } from "../../../gen/inbox__accounts.ts";
import { initial as noticesInitial, type MailNotices } from "../../../gen/inbox__notices.ts";

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

/** Signed-in accounts still being restored from Cloud. */
export const restoringAccounts: MailAccounts = accountsInitial;

/** No one is signed in to Alpha. */
export const signedOutAccounts: MailAccounts = { ...accountsInitial, phase: "SignedOut" };

/** Signed in, with no Gmail account connected. */
export const noGmail: MailAccounts = { ...accountsInitial, session: "s1", keySession: "s1", phase: "Checked", readEpoch: 1 };

/** The work account, selected. */
export const workOnly: MailAccounts = { ...noGmail, rows: [workAccount], selected: workAccount.id };

/** A personal account that may read but not change mail. */
export const personalAccount: MailAccount = { id: "grant-home", label: "ann.home@example.com", address: "ann.home@example.com", connected: true, capabilities: ["CapIdentity", "CapTriage"] };

/** Both accounts, the personal one selected. */
export const personalSelected: MailAccounts = { ...workOnly, rows: [workAccount, personalAccount], selected: personalAccount.id };

/** Forty messages in the inbox, for a long list. */
export const longList: Mailbox = {
  ...inboxList,
  rows: Array.from({ length: 40 }, (_, at) => row(`m${100 + at}`, ["Bo", "Cy", "Dee", "Eli"][at % 4]!, at % 6 === 0 ? `Re: Re: Fwd: the venue, the caterer and the schedule for the offsite (${at})` : `Update ${at}`, "A short preview of what the message says", at % 3 === 0)),
};

/** An inbox read that came back empty. */
export const emptyList: Mailbox = { ...inboxList, rows: [] };

/** No message open. */
export const readerClosed: Reader = readerInitial;

/** No draft open for the work account. */
export const noDrafts: Drafts = { owner: "o", accounts: [{ owner: "o", open: noDraft, composing: false, shelf: [] }] };

/** A draft written and set aside. */
export const draftAside: Drafts = { owner: "o", accounts: [{ ...workDrafts, composing: false }] };

/** The composer open on a new email. */
export const composing: Drafts = { owner: "o", accounts: [workDrafts] };

/** The work account's operation journal, with nothing under review. */
export const journalIdle: Journal = {
  ...journalInitial, owner: "o",
  capabilities: { ...journalInitial.capabilities, known: true, sender: workAccount.address, threads: true, send: true, providerDrafts: true, mailboxChanges: true, readState: true, stars: true, draftsList: true },
};

/** A send waiting for the owner's confirmation. */
export const journalSendReview: Journal = { ...journalIdle, records: [sendReview] };

/** An archive whose outcome Gmail never confirmed. */
export const journalUnknown: Journal = { ...journalIdle, records: [unknownArchive] };
