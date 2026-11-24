// spec/inbox/accounts.md, "Story: Choose which Gmail account my Inbox shows"; spec/inbox/drafts.md, "Back sets the draft aside, leaving keeps it open, and Drafts reopens it"; spec/inbox/mailbox.md, "Story: Read my mailbox page by page"; spec/inbox/reader.md, "Story: Read a message and its conversation"; spec/inbox/drafts.md, "Story: Keep what I write, with the account I wrote it from"; spec/inbox/operations.md, "Story: Change or send from my mailbox once, as I reviewed it"
import { Effect } from "effect";
import { useMachine as useAccounts } from "../../../gen/inbox__accounts.react.ts";
import { initial as accountsInitial } from "../../../gen/inbox__accounts.ts";
import { useMachine as useMailbox } from "../../../gen/inbox__mailbox.react.ts";
import { initial as mailboxInitial } from "../../../gen/inbox__mailbox.ts";
import { useMachine as useReader } from "../../../gen/inbox__reader.react.ts";
import { initial as readerInitial } from "../../../gen/inbox__reader.ts";
import { useMachine as useDrafts } from "../../../gen/inbox__drafts.react.ts";
import { initial as draftsInitial } from "../../../gen/inbox__drafts.ts";
import { useMachine as useJournal } from "../../../gen/inbox__operations.react.ts";
import { initial as journalInitial } from "../../../gen/inbox__operations.ts";
import { useMachine as useSelection } from "../../../gen/inbox__selection.react.ts";
import { initial as selectionInitial } from "../../../gen/inbox__selection.ts";
import { DraftsKept, MailComposer } from "../../inbox/composer.vibe";
import type { ScreenProps } from "../app-screen.ts";
import { useLayer } from "../shell/useLayer.ts";
import { InboxScreenView } from "./InboxScreenView.tsx";
import { runtime } from "./runtime.ts";
import { act, answer, now, useServiceStream } from "../shell/services.ts";

/**
 * The Inbox: the selected account's folders and searches, the open message, the composer, Drafts and the review of
 * the account's one operation.
 * @model spec/inbox/mailbox.md
 */
export function InboxScreen({ onClose }: ScreenProps) {
  const { state: accounts = accountsInitial } = useAccounts(runtime);
  const { state: mailbox = mailboxInitial } = useMailbox(runtime);
  const { state: reader = readerInitial } = useReader(runtime);
  const { state: drafts = draftsInitial } = useDrafts(runtime);
  const { state: journal = journalInitial } = useJournal(runtime);
  const { state: selection = selectionInitial } = useSelection(runtime);
  const reviewLayer = useLayer("inbox-review");
  const linkLayer = useLayer("inbox-link", "DialogLayer");
  const draftsKept = now(Effect.map(Effect.service(DraftsKept), (d) => d.kept), true);
  const composerReloads = useServiceStream("inbox/composer-reloads", Effect.map(Effect.service(MailComposer), (c) => c.reloads), 0);
  return (
    <InboxScreenView onClose={onClose} accounts={accounts} mailbox={mailbox} reader={reader} drafts={drafts} journal={journal} selection={selection}
      reviewLayer={reviewLayer} linkLayer={linkLayer} draftsKept={draftsKept} composerReloads={composerReloads} act={act} answer={answer} />
  );
}
