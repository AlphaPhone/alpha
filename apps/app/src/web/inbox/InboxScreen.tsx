// spec/inbox/accounts.md, "Story: Choose which Gmail account my Inbox shows"; spec/inbox/mailbox.md, "Story: Read my mailbox page by page"; spec/inbox/reader.md, "Story: Read a message and its conversation"; spec/inbox/drafts.md, "Story: Keep what I write, with the account I wrote it from"; spec/inbox/operations.md, "Story: Change or send from my mailbox once, as I reviewed it"
import { Effect } from "effect";
import { ChevronLeft, PenSquare, Search } from "lucide-react";
import { useState } from "react";
import { useMachine as useAccounts } from "../../../gen/inbox__accounts.react.ts";
import { initial as accountsInitial, readable, showsConnect, canChangeMail } from "../../../gen/inbox__accounts.ts";
import { useMachine as useMailbox } from "../../../gen/inbox__mailbox.react.ts";
import { initial as mailboxInitial, visibleFolders, draftsView, type Folder } from "../../../gen/inbox__mailbox.ts";
import { useMachine as useReader } from "../../../gen/inbox__reader.react.ts";
import { initial as readerInitial, type MailLink } from "../../../gen/inbox__reader.ts";
import { useMachine as useDrafts } from "../../../gen/inbox__drafts.react.ts";
import { initial as draftsInitial, accountOf, hasDraft } from "../../../gen/inbox__drafts.ts";
import { useMachine as useJournal } from "../../../gen/inbox__operations.react.ts";
import { initial as journalInitial, recordOf, kindAllowed, isComposerKind } from "../../../gen/inbox__operations.ts";
import { useMachine as useSelection } from "../../../gen/inbox__selection.react.ts";
import { initial as selectionInitial } from "../../../gen/inbox__selection.ts";
import { InboxAccounts } from "../../inbox/accounts.vibe";
import { Mailbox } from "../../inbox/mailbox.vibe";
import { Reader, type LinkReview } from "../../inbox/reader.vibe";
import { Composer, recipientCandidates } from "../../inbox/composer.vibe";
import { MailOperations, composerRef } from "../../inbox/operations.vibe";
import { MailSelection } from "../../inbox/selection.vibe";
import type { ScreenProps } from "../app-screen.ts";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, EmptyState, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/index.ts";
import { ComposerView } from "./ComposerView.tsx";
import { DraftsList } from "./DraftsList.tsx";
import { MailList } from "./MailList.tsx";
import { LinkReviewDialog, MessageView } from "./MessageView.tsx";
import { ReviewSheet } from "./ReviewSheet.tsx";
import { admissionRefusal, attachmentRefusal, composerRefusal, folderNames, operationOutcome } from "./messages.ts";
import type { AppServices } from "../runtime.ts";
import { act, ask, runtime } from "./runtime.ts";

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
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState(mailbox.query);
  const [searching, setSearching] = useState(mailbox.query !== "");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<(LinkReview & { text: string }) | undefined>(undefined);

  const mine = accountOf(drafts.owner, drafts);
  const caps = journal.capabilities;
  const record = journal.records.some((r) => r.owner === journal.owner) ? recordOf(journal.owner, journal) : undefined;
  const account = accounts.rows.find((a) => a.id === accounts.selected);
  const readableRows = accounts.rows.filter(readable);
  const writable = canChangeMail(accounts);
  const say = (text: string | undefined) => setNotice(text ?? "");
  const running = (program: Effect.Effect<string | undefined, unknown, AppServices>) => {
    setBusy(true);
    ask(Effect.ensuring(program, Effect.sync(() => setBusy(false))), say);
  };

  const back = () => {
    if (mine.composing) { ask(Effect.flatMap(Effect.service(Composer), (c) => c.back()), (r) => say(r && composerRefusal[r])); return; }
    if (reader.phase !== "Closed") { act(Effect.flatMap(Effect.service(Reader), (r) => r.close())); return; }
    if (selection.phase !== "NotSelecting") { act(Effect.flatMap(Effect.service(MailSelection), (s) => s.finish())); return; }
    if (mailbox.query !== "") { setQuery(""); setSearching(false); act(Effect.flatMap(Effect.service(Mailbox), (m) => m.search(""))); return; }
    act(Effect.flatMap(Effect.service(Composer), (c) => c.hide()));
    onClose();
  };

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
      {mine.composing && hasDraft(openDraft) ? (
        <ComposerView
          key={`${openDraft.id}:${openDraft.fields.files.length}:${openDraft.fields.forward.parts.length}`}
          draft={openDraft} account={account} accounts={readableRows} busy={busy}
          canSend={writable && caps.send} canSaveToGmail={writable && caps.providerDrafts}
          onEdit={(fields, pendingTo) => act(Effect.flatMap(Effect.service(Composer), (c) => c.edit(fields, pendingTo)))}
          onAttach={() => ask(Effect.flatMap(Effect.service(Composer), (c) => c.pickAndAttach()), (r) => say(r === undefined ? "" : r in admissionRefusal ? admissionRefusal[r as keyof typeof admissionRefusal] : composerRefusal[r as keyof typeof composerRefusal]))}
          onBack={back}
          onSend={() => running(Effect.map(Effect.flatMap(Effect.service(Composer), (c) => c.send()), (r) => (r in operationOutcome ? operationOutcome[r as keyof typeof operationOutcome] : composerRefusal[r as keyof typeof composerRefusal])))}
          onSaveToGmail={() => { setReviewOpen(true); running(Effect.map(Effect.flatMap(Effect.service(Composer), (c) => c.saveToGmail()), (r) => (r === undefined ? undefined : r in operationOutcome ? operationOutcome[r as keyof typeof operationOutcome] : composerRefusal[r as keyof typeof composerRefusal]))); }}
          candidates={recipientCandidates(mailbox, reader, mine.shelf)}
          onMove={(grant) => ask(Effect.flatMap(Effect.service(Composer), (c) => c.transfer(grant)), (r) => say(r === undefined ? `Draft in ${readableRows.find((a) => a.id === grant)?.label ?? "the other account"}` : composerRefusal[r]))}
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
              {searching ? (
                <form role="search" onSubmit={(event) => { event.preventDefault(); act(Effect.flatMap(Effect.service(Mailbox), (m) => m.search(query))); }}>
                  <Input aria-label="Search mail" autoFocus value={query} onChange={(event) => setQuery(event.currentTarget.value)} className="w-40" />
                </form>
              ) : <Button size="icon" variant="ghost" aria-label="Search" onClick={() => setSearching(true)}><Search aria-hidden /></Button>}
              <Button size="icon" variant="ghost" aria-label="New email" disabled={drafts.owner === ""} onClick={() => ask(Effect.flatMap(Effect.service(Composer), (c) => c.compose()), (r) => say(r && composerRefusal[r]))}><PenSquare aria-hidden /></Button>
            </div>
          </header>
          <div className="flex flex-wrap gap-2 px-4 py-1">
            {account.capabilities.includes("CapTriage") && !account.capabilities.includes("CapMailbox") && !accounts.fromDisk && (
              <Button size="sm" variant="ghost" onClick={() => act(Effect.flatMap(Effect.service(InboxAccounts), (a) => a.requestAccess("ChangeMail")))}>Allow Gmail changes</Button>
            )}
            {hasDraft(openDraft) && !mine.composing && <Button size="sm" variant="secondary" onClick={() => act(Effect.flatMap(Effect.service(Composer), (c) => c.resume()))}>Continue draft</Button>}
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
              onReply={(mode) => ask(Effect.flatMap(Effect.service(Composer), (c) => c.reply(mode)), (r) => say(r === undefined ? "" : r in composerRefusal ? composerRefusal[r as keyof typeof composerRefusal] : `Not forwarded: ${r}`))}
              onChange={(kind) => {
                if (!kindAllowed(caps, kind)) { say(operationOutcome.Refused); return; }
                setReviewOpen(true);
                running(Effect.map(Effect.flatMap(Effect.service(MailOperations), (o) => o.prepare(kind, { tag: "LabelProposal", messageId: reader.body.id, expectedHistoryId: reader.body.historyId }, { draftId: "", content: "" }, { localDraft: "", revision: 0, gmailDraft: "", gmailDigest: "" })), (r) => (r === undefined ? undefined : operationOutcome[r])));
              }}
              onSetRead={(unread) => act(Effect.flatMap(Effect.service(Reader), (r) => r.setRead(unread, true)))}
              onShowImages={() => act(Effect.flatMap(Effect.service(Reader), (r) => r.showImages()))}
              onPage={(next) => act(Effect.flatMap(Effect.service(Reader), (r) => r.page(next)))}
              onAttachment={(part) => ask(Effect.flatMap(Effect.service(Reader), (r) => r.openAttachment(part)), (r) => say(r && attachmentRefusal[r]))}
              onOpenAttachment={() => ask(Effect.flatMap(Effect.service(Reader), (r) => r.handOff()), (r) => say(r === "HandedOpened" ? "Asked Android to open the file." : r === "HandedCancelled" ? "" : "Couldn't confirm that the file opened."))}
              onSaveAttachment={() => act(Effect.flatMap(Effect.service(Reader), (r) => r.saveAttachment()))}
              onCloseAttachment={() => act(Effect.flatMap(Effect.service(Reader), (r) => r.closeAttachment()))}
              onAsk={() => ask(Effect.flatMap(Effect.service(Reader), (r) => r.askAgent()), (r) => say(r === undefined ? "" : r === "too-large" ? "This email is too long to send to your agent in full. Nothing was sent." : r === "changed" ? "The email changed. Open it again; nothing was sent." : "Open a current email and connect your agent first."))}
              onLink={(l: MailLink) => ask(Effect.flatMap(Effect.service(Reader), (r) => r.reviewLink(l)), (review) => (review === undefined ? say("Not HTTPS") : setLink({ ...review, text: l.text })))}
            />
          ) : draftsView(mailbox) ? (
            <DraftsList
              drafts={mine} gmailDrafts={mailbox.drafts} localOnly={mailbox.localDraftsOnly}
              onOpenLocal={(id, confirmed) => ask(Effect.flatMap(Effect.service(Composer), (c) => c.openShelved(id, confirmed)), (r) => say(r && composerRefusal[r]))}
              onOpenGmail={(row) => ask(Effect.flatMap(Effect.service(Composer), (c) => c.openGmailDraft(row, false)), (r) => say(r && composerRefusal[r]))}
              onDelete={(picks) => ask(Effect.flatMap(Effect.service(Composer), (c) => c.deleteShelved(picks)), (ok) => say(ok ? "Drafts deleted." : "These drafts changed. Select them again."))}
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
            />
          )}
        </>
      )}
      {notice !== "" && <p role="status" aria-live="polite" className="sticky bottom-0 bg-card px-4 py-2 text-sm shadow-md">{notice}</p>}
      <ReviewSheet
        record={record} open={reviewOpen} busy={busy}
        confirmable={record !== undefined && kindAllowed(caps, record.kind) && (!isComposerKind(record.kind) || (hasDraft(openDraft) && composerRef(openDraft).content === record.composer.content && openDraft.id === record.composer.draftId))}
        onConfirm={() => running(Effect.map(Effect.flatMap(Effect.service(MailOperations), (o) => o.confirm(hasDraft(openDraft) ? composerRef(openDraft) : { draftId: "", content: "" })), (r) => operationOutcome[r]))}
        onRefresh={() => running(Effect.map(Effect.flatMap(Effect.service(MailOperations), (o) => o.refresh()), (r) => (r === undefined ? undefined : operationOutcome[r])))}
        onRetry={() => running(Effect.map(Effect.flatMap(Effect.service(MailOperations), (o) => o.retry()), (r) => (r === undefined ? undefined : operationOutcome[r])))}
        onClear={() => ask(Effect.flatMap(Effect.service(MailOperations), (o) => o.clear()), () => setReviewOpen(false))}
        onAbandon={() => ask(Effect.flatMap(Effect.service(MailOperations), (o) => o.abandon()), (ok) => { if (ok) setReviewOpen(false); })}
        onUndo={() => running(Effect.map(Effect.flatMap(Effect.service(MailOperations), (o) => o.undo()), (r) => (r === undefined ? undefined : operationOutcome[r])))}
        onContinueDraft={() => ask(Effect.flatMap(Effect.service(MailOperations), (o) => o.continueDraft()), (r) => { if (r === "opened") setReviewOpen(false); else say(r === "changed" ? composerRefusal["gmail-draft-changed"] : r === "busy" ? composerRefusal["drafts-full"] : "Unavailable"); })}
        onDeleteDraft={() => running(Effect.map(Effect.flatMap(Effect.service(MailOperations), (o) => o.deleteGmailDraft()), (r) => (r === undefined ? undefined : operationOutcome[r])))}
        onClose={() => setReviewOpen(false)}
      />
      <LinkReviewDialog
        review={link} onCancel={() => setLink(undefined)}
        onOpen={() => { const review = link; setLink(undefined); if (review) ask(Effect.flatMap(Effect.service(Reader), (r) => r.openLink(review)), (ok) => say(ok ? "" : "Browser is unavailable.")); }}
      />
    </main>
  );
}
