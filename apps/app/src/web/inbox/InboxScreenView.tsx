// spec/inbox/accounts.md, "Story: Choose which Gmail account my Inbox shows"; spec/inbox/drafts.md, "Back sets the draft aside, leaving keeps it open, and Drafts reopens it"; spec/inbox/mailbox.md, "Story: Read my mailbox page by page"; spec/inbox/reader.md, "Story: Read a message and its conversation"; spec/inbox/drafts.md, "Story: Keep what I write, with the account I wrote it from"; spec/inbox/operations.md, "Story: Change or send from my mailbox once, as I reviewed it"
import { Effect } from "effect";
import { ChevronLeft, PenSquare, Search } from "lucide-react";
import { useState } from "react";
import { readable, showsConnect, mayChangeMail, type MailAccounts } from "../../../gen/inbox__accounts.ts";
import { visibleFolders, draftsView, type Folder, type Mailbox as MailboxState } from "../../../gen/inbox__mailbox.ts";
import type { MailLink, Reader as ReaderState } from "../../../gen/inbox__reader.ts";
import { accountOf, hasDraft, saysNotKept, type Drafts } from "../../../gen/inbox__drafts.ts";
import { recordOf, kindAllowed, isComposerKind, type Journal } from "../../../gen/inbox__operations.ts";
import type { Selection } from "../../../gen/inbox__selection.ts";
import { InboxAccounts } from "../../inbox/accounts.vibe";
import { Mailbox } from "../../inbox/mailbox.vibe";
import { Reader, type LinkReview } from "../../inbox/reader.vibe";
import { MailComposer, recipientCandidates, type ComposerRefusal } from "../../inbox/composer.vibe";
import { MailOperations, composerRef, type OperationOutcome } from "../../inbox/operations.vibe";
import { MailSelection } from "../../inbox/selection.vibe";
import { inboxBack } from "../../inbox/back.vibe";
import type { ScreenProps } from "../app-screen.ts";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, EmptyState, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/index.ts";
import { ComposerView } from "./ComposerView.tsx";
import { DraftsList } from "./DraftsList.tsx";
import { MailList } from "./MailList.tsx";
import { LinkReviewDialog, MessageView } from "./MessageView.tsx";
import { ReviewSheet } from "./ReviewSheet.tsx";
import { admissionRefusal, attachmentRefusal, composerRefusal, draftsNotKept, folderNames, journalNotice, operationOutcome, outcomeFeedback } from "./messages.ts";
import type { AppServices } from "../runtime.ts";
import type { act as runAction, answer as runAnswer } from "../shell/services.ts";
import type { useLayer } from "../shell/useLayer.ts";

/** A sheet or dialog listed in the shell's navigation, so Back and HOME close it. */
export type InboxLayer = ReturnType<typeof useLayer>;

/** The Inbox's machine states, its two navigation layers, and the runners its controls call Inbox services through. */
export interface InboxScreenViewProps extends ScreenProps {
  /** The Gmail accounts and the one selected. */
  accounts: MailAccounts;
  /** The selected account's folder or search, page by page. */
  mailbox: MailboxState;
  /** The open message, its conversation and attachment. */
  reader: ReaderState;
  /** Every account's open draft and set-aside drafts. */
  drafts: Drafts;
  /** The account's one operation under review, with its receipt. */
  journal: Journal;
  /** The messages picked for a batch change. */
  selection: Selection;
  /** The review sheet's navigation layer. */
  reviewLayer: InboxLayer;
  /** The link review's navigation layer. */
  linkLayer: InboxLayer;
  /** Whether the drafts are kept in the phone's mail store, rather than only in memory. */
  draftsKept: boolean;
  /** How many times the composer had to show the saved draft again because an edit over it was refused. */
  composerReloads: number;
  /** Runs one Inbox effect without awaiting it. */
  act: typeof runAction;
  /** Runs one Inbox effect and hands its answer on. */
  answer: typeof runAnswer;
}

/**
 * The Inbox's whole screen: the selected account's folders and searches, the open message, the composer, Drafts and the review of
 * the account's one operation.
 * @model spec/inbox/mailbox.md
 */
export function InboxScreenView({ onClose, accounts, mailbox, reader, drafts, journal, selection, reviewLayer, linkLayer, draftsKept, composerReloads, act, answer }: InboxScreenViewProps) {
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState({ shown: mailbox.query, open: mailbox.query !== "", text: mailbox.query });
  if (search.shown !== mailbox.query) setSearch({ shown: mailbox.query, open: mailbox.query !== "", text: mailbox.query });
  const reviewOpen = reviewLayer.open;
  const setReviewOpen = (open: boolean) => (open ? reviewLayer.show() : reviewLayer.hide());
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<(LinkReview & { text: string }) | undefined>(undefined);
  const closeLink = () => { setLink(undefined); linkLayer.hide(); };

  const draftsOnlyInMemory = saysNotKept(draftsKept ? "KeptOnPhone" : "MemoryOnly");
  const mine = accountOf(drafts.owner, drafts);
  const caps = journal.capabilities;
  const record = journal.records.some((r) => r.owner === journal.owner) ? recordOf(journal.owner, journal) : undefined;
  const account = accounts.rows.find((a) => a.id === accounts.selected);
  const readableRows = accounts.rows.filter(readable);
  const writable = mayChangeMail(accounts);
  const say = (text: string | undefined) => setNotice(text ?? "");
  const answered = (outcome: OperationOutcome | ComposerRefusal | undefined) => {
    if (outcome === undefined) { say(""); return; }
    if (outcome in operationOutcome) {
      const feedback = outcomeFeedback(outcome as OperationOutcome);
      say(feedback.notice);
      if (feedback.review !== "keep") setReviewOpen(feedback.review === "open");
      return;
    }
    say(composerRefusal[outcome as ComposerRefusal]);
  };
  const operating = (program: Effect.Effect<OperationOutcome | ComposerRefusal | undefined, unknown, AppServices>) => {
    setBusy(true);
    answer(Effect.ensuring(program, Effect.sync(() => setBusy(false))), answered);
  };

  const back = () => answer(inboxBack(), (step) => {
    if (step.refusal !== undefined) say(composerRefusal[step.refusal]);
    if (step.taken) return;
    if (search.open) { setSearch({ ...search, open: false, text: "" }); return; }
    onClose();
  });

  if (accounts.phase === "CloudRestoring" || (accounts.phase === "Checking" && accounts.rows.length === 0)) {
    return <main className="flex h-full items-center justify-center"><p role="status">Loading Inbox…</p></main>;
  }
  if (accounts.phase === "SignedOut") {
    return (
      <main className="flex h-full flex-col">
        <header className="flex items-center px-2"><Button size="icon" variant="ghost" aria-label="Back" onClick={onClose}><ChevronLeft aria-hidden /></Button></header>
        <EmptyState title="Sign in to read your mail" />
      </main>
    );
  }
  if (showsConnect(accounts) || account === undefined) {
    return (
      <main className="flex h-full flex-col">
        <header className="flex items-center px-2"><Button size="icon" variant="ghost" aria-label="Back" onClick={onClose}><ChevronLeft aria-hidden /></Button></header>
        <EmptyState title="Connect Gmail">
          <Button onClick={() => act(Effect.flatMap(Effect.service(InboxAccounts), (a) => a.requestAccess("ReadMail")))}>Connect Gmail</Button>
        </EmptyState>
      </main>
    );
  }

  const openDraft = mine.open;
  return (
    <main className="flex h-full flex-col overflow-y-auto">
      {draftsOnlyInMemory && <p role="alert" className="sticky top-0 bg-card px-4 py-2 text-sm shadow-md">{draftsNotKept}</p>}
      {mine.composing && hasDraft(openDraft) ? (
        <ComposerView
          key={`${openDraft.id}:${openDraft.fields.files.length}:${openDraft.fields.forward.parts.length}:${composerReloads}`}
          draft={openDraft} account={account} accounts={readableRows} busy={busy}
          canSend={writable && caps.send} canSaveToGmail={writable && caps.providerDrafts}
          onEdit={(fields, pendingTo) => act(Effect.flatMap(Effect.service(MailComposer), (c) => c.edit(fields, pendingTo)))}
          onAttach={() => answer(Effect.flatMap(Effect.service(MailComposer), (c) => c.pickAndAttach()), (r) => say(r === undefined ? "" : r in admissionRefusal ? admissionRefusal[r as keyof typeof admissionRefusal] : composerRefusal[r as keyof typeof composerRefusal]))}
          onBack={back}
          onSend={() => operating(Effect.flatMap(Effect.service(MailComposer), (c) => c.send()))}
          onSaveToGmail={() => { setReviewOpen(true); operating(Effect.flatMap(Effect.service(MailComposer), (c) => c.saveToGmail())); }}
          candidates={recipientCandidates(mailbox, reader, mine.shelf)}
          onMove={(grant) => answer(Effect.flatMap(Effect.service(MailComposer), (c) => c.transfer(grant)), (r) => say(r === undefined ? `Draft in ${readableRows.find((a) => a.id === grant)?.label ?? "the other account"}` : composerRefusal[r]))}
        />
      ) : (
        <>
          <header className="flex items-center gap-1 px-2 pt-2">
            <Button size="icon" variant="ghost" aria-label="Back" onClick={back}><ChevronLeft aria-hidden /></Button>
            {readableRows.length > 1 ? (
              <Select value={accounts.selected} onValueChange={(id) => act(Effect.flatMap(Effect.service(InboxAccounts), (a) => a.choose(id)))} disabled={accounts.fromDisk}>
                <SelectTrigger aria-label="Gmail account" className="max-w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{readableRows.map((a) => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
            ) : <span className="truncate font-mono text-xs uppercase text-muted-foreground">{account.label}</span>}
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="sm">{folderNames[mailbox.folder]}</Button></DropdownMenuTrigger>
              <DropdownMenuContent>
                {visibleFolders(mailbox.spamTrash).map((folder: Folder) => (
                  <DropdownMenuItem key={folder} onSelect={() => act(Effect.flatMap(Effect.service(Mailbox), (m) => m.setFolder(folder)))}>{folderNames[folder]}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="ml-auto flex items-center gap-1">
              {search.open ? (
                <form role="search" onSubmit={(event) => { event.preventDefault(); act(Effect.flatMap(Effect.service(Mailbox), (m) => m.search(search.text))); }}>
                  <Input aria-label="Search mail" autoFocus value={search.text} onChange={(event) => setSearch({ ...search, text: event.currentTarget.value })} className="w-40" />
                </form>
              ) : <Button size="icon" variant="ghost" aria-label="Search" onClick={() => setSearch({ ...search, open: true })}><Search aria-hidden /></Button>}
              <Button size="icon" variant="ghost" aria-label="New email" disabled={drafts.owner === ""} onClick={() => answer(Effect.flatMap(Effect.service(MailComposer), (c) => c.compose()), (r) => say(r && composerRefusal[r]))}><PenSquare aria-hidden /></Button>
            </div>
          </header>
          <div className="flex flex-wrap gap-2 px-4 py-1">
            {account.capabilities.includes("CapTriage") && !account.capabilities.includes("CapMailbox") && !accounts.fromDisk && (
              <Button size="sm" variant="ghost" onClick={() => act(Effect.flatMap(Effect.service(InboxAccounts), (a) => a.requestAccess("ChangeMail")))}>Allow Gmail changes</Button>
            )}
            {hasDraft(openDraft) && !mine.composing && <Button size="sm" variant="secondary" onClick={() => act(Effect.flatMap(Effect.service(MailComposer), (c) => c.resume()))}>Continue draft</Button>}
            {record !== undefined && !(record.kind === "SendKind" && record.receipt.receiptState === "SucceededReceipt") && (
              <Button size="sm" variant="secondary" onClick={() => setReviewOpen(true)}>Mail review / receipt</Button>
            )}
            {reader.phase === "Closed" && selection.phase === "NotSelecting" && !draftsView(mailbox) && (
              <Button size="sm" variant="ghost" disabled={!writable} onClick={() => act(Effect.flatMap(Effect.service(MailSelection), (s) => s.start()))}>Select emails</Button>
            )}
          </div>
          {reader.phase !== "Closed" ? (
            <MessageView
              reader={reader} canMarkRead={writable && caps.readState} canChange={writable && caps.mailboxChanges}
              onBack={back}
              onReply={(mode) => answer(Effect.flatMap(Effect.service(MailComposer), (c) => c.reply(mode)), (r) => say(r === undefined ? "" : r in composerRefusal ? composerRefusal[r as keyof typeof composerRefusal] : `Not forwarded: ${r}`))}
              onChange={(kind) => {
                if (!kindAllowed(caps, kind)) { say(operationOutcome.Refused); return; }
                setReviewOpen(true);
                operating(Effect.flatMap(Effect.service(MailOperations), (o) => o.prepare(kind, { tag: "LabelProposal", messageId: reader.body.id, expectedHistoryId: reader.body.historyId }, { draftId: "", content: "" }, { localDraft: "", revision: 0, gmailDraft: "", gmailDigest: "" })));
              }}
              onSetRead={(unread) => act(Effect.flatMap(Effect.service(Reader), (r) => r.setRead(unread, true)))}
              onShowImages={() => act(Effect.flatMap(Effect.service(Reader), (r) => r.showImages()))}
              onPage={(next) => act(Effect.flatMap(Effect.service(Reader), (r) => r.page(next)))}
              onAttachment={(part) => answer(Effect.flatMap(Effect.service(Reader), (r) => r.openAttachment(part)), (r) => say(r && attachmentRefusal[r]))}
              onOpenAttachment={() => answer(Effect.flatMap(Effect.service(Reader), (r) => r.handOff()), (r) => say(r === "HandedOpened" ? "Asked Android to open the file." : r === "HandedCancelled" ? "" : "Couldn't confirm that the file opened."))}
              onSaveAttachment={() => act(Effect.flatMap(Effect.service(Reader), (r) => r.saveAttachment()))}
              onCloseAttachment={() => act(Effect.flatMap(Effect.service(Reader), (r) => r.closeAttachment()))}
              onAsk={() => answer(Effect.flatMap(Effect.service(Reader), (r) => r.askAgent()), (r) => say(r === undefined ? "" : r === "too-large" ? "This email is too long to send to your agent in full. Nothing was sent." : r === "changed" ? "The email changed. Open it again; nothing was sent." : "Open a current email and connect your agent first."))}
              onLink={(l: MailLink) => answer(Effect.flatMap(Effect.service(Reader), (r) => r.reviewLink(l)), (review) => { if (review === undefined) { say("Not HTTPS"); return; } setLink({ ...review, text: l.text }); linkLayer.show(); })}
            />
          ) : draftsView(mailbox) ? (
            <DraftsList
              drafts={mine} gmailDrafts={mailbox.drafts} localOnly={mailbox.localDraftsOnly}
              onOpenLocal={(id, confirmed) => answer(Effect.flatMap(Effect.service(MailComposer), (c) => c.openShelved(id, confirmed)), (r) => say(r && composerRefusal[r]))}
              onOpenGmail={(row) => answer(Effect.flatMap(Effect.service(MailComposer), (c) => c.openGmailDraft(row, false)), (r) => say(r && composerRefusal[r]))}
              onDelete={(picks) => answer(Effect.flatMap(Effect.service(MailComposer), (c) => c.deleteShelved(picks)), (ok) => say(ok ? "Drafts deleted." : "These drafts changed. Select them again."))}
            />
          ) : (
            <MailList
              mailbox={mailbox} selection={selection} readOnly={accounts.fromDisk}
              onOpen={(row) => act(Effect.flatMap(Effect.service(Reader), (r) => r.open(row)))}
              onLoadMore={() => act(Effect.flatMap(Effect.service(Mailbox), (m) => m.loadMore()))}
              onRetry={() => act(Effect.flatMap(Effect.service(Mailbox), (m) => m.refresh()))}
              onToggle={(item) => act(Effect.flatMap(Effect.service(MailSelection), (s) => s.toggle(item)))}
              onPickAll={(items) => act(Effect.flatMap(Effect.service(MailSelection), (s) => s.pickAll(items)))}
              onReview={(action) => act(Effect.flatMap(Effect.service(MailSelection), (s) => Effect.andThen(s.review(action), s.apply())))}
              onFinishSelecting={() => act(Effect.flatMap(Effect.service(MailSelection), (s) => s.finish()))}
              canSwipeArchive={writable && kindAllowed(caps, "ArchiveKind")}
              onSwipeArchive={(row) => { setReviewOpen(true); operating(Effect.flatMap(Effect.service(MailOperations), (o) => o.archiveListed(row.id))); }}
            />
          )}
        </>
      )}
      {(notice !== "" || journalNotice[journal.notice] !== "") && (
        <p role="status" aria-live="polite" className="sticky bottom-0 bg-card px-4 py-2 text-sm shadow-md">{notice || journalNotice[journal.notice]}</p>
      )}
      <ReviewSheet
        record={record} open={reviewOpen} busy={busy}
        confirmable={record !== undefined && kindAllowed(caps, record.kind) && (!isComposerKind(record.kind) || (hasDraft(openDraft) && composerRef(openDraft).content === record.composer.content && openDraft.id === record.composer.draftId))}
        onConfirm={() => operating(Effect.flatMap(Effect.service(MailOperations), (o) => o.confirm(hasDraft(openDraft) ? composerRef(openDraft) : { draftId: "", content: "" })))}
        onRefresh={() => operating(Effect.flatMap(Effect.service(MailOperations), (o) => o.refresh()))}
        onRetry={() => operating(Effect.flatMap(Effect.service(MailOperations), (o) => o.retry()))}
        onClear={() => answer(Effect.flatMap(Effect.service(MailOperations), (o) => o.clear()), () => setReviewOpen(false))}
        onAbandon={() => answer(Effect.flatMap(Effect.service(MailOperations), (o) => o.abandon()), (ok) => { if (ok) setReviewOpen(false); })}
        onUndo={() => operating(Effect.flatMap(Effect.service(MailOperations), (o) => o.undo()))}
        onContinueDraft={() => answer(Effect.flatMap(Effect.service(MailOperations), (o) => o.continueDraft()), (r) => { if (r === "opened") setReviewOpen(false); else say(r === "changed" ? composerRefusal["gmail-draft-changed"] : r === "busy" ? composerRefusal["drafts-full"] : "Unavailable"); })}
        onDeleteDraft={() => operating(Effect.flatMap(Effect.service(MailOperations), (o) => o.deleteGmailDraft()))}
        onClose={() => setReviewOpen(false)}
      />
      <LinkReviewDialog
        review={linkLayer.open ? link : undefined} onCancel={closeLink}
        onOpen={() => { const review = link; closeLink(); if (review) answer(Effect.flatMap(Effect.service(Reader), (r) => r.openLink(review)), (ok) => say(ok ? "" : "Browser is unavailable.")); }}
      />
    </main>
  );
}
