import type { ComponentMeta } from "vibestack/stories";
import type { InboxScreenViewProps } from "./InboxScreenView.tsx";
import {
  composing, draftAside, emptyList, failedList, inboxList, journalIdle, journalSendReview, journalUnknown, loadingMessage, longList, noDrafts, noGmail,
  notSelecting, openMessage, personalSelected, readerClosed, restoringAccounts, signedOutAccounts, workOnly,
} from "./fixtures.ts";

const none = () => undefined;
const closed = { open: false, top: false, show: none, hide: none };
const shown = { open: true, top: true, show: none, hide: none };

export const meta: ComponentMeta<InboxScreenViewProps> = {
  args: {
    onClose: none, accounts: workOnly, mailbox: inboxList, reader: readerClosed, drafts: noDrafts, journal: journalIdle, selection: notSelecting,
    reviewLayer: closed, linkLayer: closed, act: none, answer: none,
  },
  examples: {
    Restoring: { accounts: restoringAccounts },
    SignedOut: { accounts: signedOutAccounts },
    ConnectGmail: { accounts: noGmail },
    Empty: { mailbox: emptyList },
    LongList: { mailbox: longList },
    ReadFailed: { mailbox: failedList },
    ReadOnlyAccount: { accounts: personalSelected },
    MessageLoading: { reader: loadingMessage },
    Message: { reader: openMessage, drafts: draftAside },
    SendReview: { drafts: composing, journal: journalSendReview, reviewLayer: shown },
    ArchiveUnconfirmed: { journal: journalUnknown, reviewLayer: shown },
  },
};
