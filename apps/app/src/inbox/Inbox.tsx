// spec/app/inbox/index.md, "Story: See my mail"; spec/app/inbox/message.md, "Story: Read a message"; spec/app/inbox/marking.md, "Story: Mark mail read or unread"; spec/app/inbox/sending.md, "Story: Archive or trash mail, with Undo"
import {
  Alert, Button, InboxAccountList, InboxAccountSheet, InboxAttachmentReview, InboxChangeReview, InboxChangeToast, type InboxFolder,
  InboxLinkReview, type InboxListRow, InboxListScreen, type InboxListStateKind, InboxMessageScreen, type InboxMessageFaultKind,
  type InboxNoticeKind, ToastRegion,
} from "@repo/ui";
import type { MailCard, MailMessage } from "@elizaos/cloud/client";
import { Effect, type ManagedRuntime } from "effect";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { type Folder, type Mailbox, accessOf, readable, searchableIn } from "../../gen/app__inbox.ts";
import type { Machine as List } from "../../gen/app__inbox.effect.vibe";
import { useMachine as useList } from "../../gen/app__inbox.react.ts";
import type { Machine as Marks } from "../../gen/app__inbox__marking.effect.vibe";
import { useMachine as useMarks } from "../../gen/app__inbox__marking.react.ts";
import type { Fault } from "../../gen/app__inbox__message.ts";
import type { Machine as Shown } from "../../gen/app__inbox__message.effect.vibe";
import { imagesLoad } from "../../gen/app__inbox__message.ts";
import { useMachine as useMessage } from "../../gen/app__inbox__message.react.ts";
import type { Machine as Changes } from "../../gen/app__inbox__sending.effect.vibe";
import { type Kind, type Operations, aside } from "../../gen/app__inbox__sending.ts";
import { useMachine as useChanges } from "../../gen/app__inbox__sending.react.ts";
import type { Machine as Writing } from "../../gen/app__inbox__drafts.effect.vibe";
import { useMachine as useDrafts } from "../../gen/app__inbox__drafts.react.ts";
import type { Machine as Shell } from "../../gen/app__shell.effect.vibe";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import type { Machine as Preferences } from "../../gen/app__settings__preferences.effect.vibe";
import { useMachine as usePreferences } from "../../gen/app__settings__preferences.react.ts";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { Time } from "../runtime/time.vibe";
import { Compose, FileOffer, Shelf, Suggested } from "./Compose.tsx";
import type { Offers } from "./suggestion.vibe";
import type { Machine as Offering } from "../../gen/app__inbox__suggestion.effect.vibe";
import type { Incoming } from "./adding.vibe";
import type { Machine as Adding } from "../../gen/app__inbox__adding.effect.vibe";
import { type Beginning, Letters, begin } from "./composer.vibe";
import { type Letter, Mail, revisionOf } from "./gmail.vibe";
import { connectMailFrame, frameDocument, prepareMessage } from "./mail-html.ts";

export interface InboxProps {
  /** Provides the list, the message open and its marks, the changes, the shell, and Mail, which holds what Gmail said. */
  runtime: ManagedRuntime.ManagedRuntime<List | Shown | Marks | Changes | Writing | Adding | Incoming | Offering | Offers | Letters | Shell | Mail | Time | Preferences, unknown>;
}

type Runtime = InboxProps["runtime"];

const folderNames = {
  Incoming: "incoming", Starred: "starred", Sent: "sent", DraftsFolder: "drafts", AllMail: "allMail", Archived: "archived", Spam: "spam", Trashed: "trashed",
} as const satisfies Record<Folder, InboxFolder>;
const folderOf = Object.fromEntries(Object.entries(folderNames).map(([folder, name]) => [name, folder])) as Record<InboxFolder, Folder>;

const faultNames = { Unreachable: "unreachable", Stale: "changed", Moved: "conversationChanged", TooLarge: "tooLarge" } as const satisfies Partial<Record<Fault, InboxMessageFaultKind>>;

const markNotices = { Busy: "markBusy", NotMarked: "markFailed", Unconfirmed: "markUnconfirmed" } as const satisfies Record<string, InboxNoticeKind>;

const operationNames = { Archive: "archive", Trash: "trash", Unarchive: "unarchive", Untrash: "untrash" } as const satisfies Partial<Record<Kind, string>>;
type Change = keyof typeof operationNames;
const isChange = (kind: Kind): kind is Change => kind in operationNames;

/** What Mail holds, read at the state the screen shows. */
const mailOf = <A,>(runtime: Runtime, read: (mail: Mail["Service"]) => A): A => runtime.runSync(Mail.use((mail) => Effect.sync(() => read(mail))));

/** When a message arrived, as the list words it: a time on Alpha's day, else a date. */
function arrived(receivedAt: string, today: number): string {
  const at = new Date(receivedAt);
  if (Number.isNaN(at.getTime())) return "";
  const sameDay = new Date(today).toDateString() === at.toDateString();
  return sameDay ? at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : at.toLocaleDateString([], { month: "short", day: "numeric" });
}

/** The name a sender wrote, else the address. */
const senderName = (from: string) => from.replace(/<[^>]*>/u, "").replace(/"/gu, "").trim() || from;
const senderAddress = (from: string) => /<([^>]+)>/u.exec(from)?.[1] ?? from;

/** Why the list has nothing to show, as the list's state says it; none where it has rows to show or is reading. */
function emptyOf(s: Mailbox): InboxListStateKind | undefined {
  if (!s.signedIn) return "signedOut";
  if (s.accounts.status === "Loaded" && s.selected.account === 0 && s.connected.length === 0) return "notConnected";
  if (s.accounts.status === "Loaded" && s.selected.account !== 0 && !readable(s)) return "needsAccess";
  if (readable(s) && !searchableIn(s.selected.folder, s)) return "unavailable";
  if (s.list.status === "Failed") return s.failure === "Offline" ? "offline" : "failed";
  if (s.list.status === "Loaded" && s.pages > 0 && s.total === 0) return s.selected.query === "" ? "empty" : "noResults";
  return undefined;
}

/** What the list tells the owner above its messages, most pressing first. */
function noticeOf(s: Mailbox): InboxNoticeKind | undefined {
  if (s.failure === "Revoked") return "reconnect";
  if (s.list.status === "Failed" && s.pages > 0) return s.failure === "Offline" ? "offline" : "unreachable";
  if (s.saved) return "savedList";
  if (s.doubtful) return "listOutOfDate";
  if (s.moved) return "newerMailMissing";
  return undefined;
}

/** Archive, Trash or a restore of `messages` on the list's account, as the list's revision has them. */
function changeOf(list: Mailbox, kind: Change, messages: number[], history: number) {
  const account = list.selected.account;
  return {
    type: "prepareChange", kind, access: accessOf(list, account), account, messages, revision: list.revision, history, fresh: list.pages > 0 && !list.saved,
  } as const;
}

/** The review of a change to messages, and the toast of how it stands: Undo while held, then how it ended. */
function ChangeReview({ runtime, list, cards }: { runtime: Runtime; list: Mailbox; cards: (message: number) => MailCard | undefined }) {
  const { state, can, send } = useTimed(runtime, useChanges);
  const listed = useList(runtime);
  if (!state || !isChange(state.kind)) return null;
  const operation = operationNames[state.kind];
  const confirm = { type: "confirm", revision: list.revision, access: accessOf(list, state.account), now: untimed } as const;
  const undo = { type: "undo", now: untimed } as const;
  const restoring = () => {
    if (state.attempt.outcome !== "Confirmed" || (state.kind !== "Archive" && state.kind !== "Trash")) return undefined;
    const event = changeOf(list, state.kind === "Archive" ? "Unarchive" : "Untrash", state.messages, revisionOf(cards(state.messages[0] ?? 0)));
    return can(event, "Owner") ? () => void send(event, "Owner") : undefined;
  };
  return (
    <>
      <InboxChangeReview
        open={state.review.showing}
        operation={operation}
        messages={state.messages.map((message) => ({ id: String(message), sender: senderName(cards(message)?.from ?? ""), subject: cards(message)?.subject ?? "" }))}
        changed={state.changed}
        onConfirm={can(confirm, "Owner") ? () => void send(confirm, "Owner").then(() => {
          if (listed.can({ type: "held" })) void listed.send({ type: "held" });
        }) : undefined}
        onCancel={() => void send({ type: "cancel" }, "Owner")}
      />
      <ToastRegion>{toastOf(state, operation, can(undo, "Owner") ? () => void send(undo, "Owner") : restoring(), () => void send({ type: "dismissOutcome" }, "Owner"))}</ToastRegion>
    </>
  );
}

function toastOf(state: Operations, operation: (typeof operationNames)[Change], onUndo: (() => void) | undefined, onDismiss: () => void): ReactNode {
  const count = state.messages.length;
  if (onUndo) return <InboxChangeToast operation={operation} count={count} phase={state.attempt.outcome === "Confirmed" ? "done" : "holding"} onUndo={onUndo} />;
  if (!state.noticed) return <div onClick={onDismiss}><InboxChangeToast operation={operation} count={count} phase="unknown" /></div>;
  if (state.attempt.outcome === "Refused") return <InboxChangeToast operation={operation} count={count} phase={state.history >= 1 ? "outOfDate" : "refused"} />;
  return null;
}

/** The body of a message with nothing able to run, its remote images only once they may load, and its links each reviewed. */
function Body({ read, images, onReview }: { read: MailMessage; images: boolean; onReview: (link: number) => void }) {
  const { formatted, links } = prepareMessage(read);
  const document = useMemo(() => formatted ? frameDocument(formatted, images) : undefined, [formatted, images]);
  const frame = useCallback((node: HTMLIFrameElement | null) => node ? connectMailFrame(node, onReview) : undefined, [onReview]);
  const additional = links.flatMap((link, at) => formatted?.inline.has(link.url) ? [] : [{ ...link, at: at + 1 }]);
  const list = (
    <ul aria-label="Links" className="flex flex-col items-start gap-1">
      {additional.map((link) => (
        <li key={link.url} className="min-w-0 max-w-full text-sm [overflow-wrap:anywhere]">
          {link.secure ? <Button variant="ghost" className="h-auto whitespace-normal text-left text-primary" onClick={() => onReview(link.at)}>{link.label}</Button> : link.label}
        </li>
      ))}
    </ul>
  );
  return <>
    {document
      ? <iframe ref={frame} title="Formatted email" sandbox="allow-same-origin" referrerPolicy="no-referrer" className="block h-96 w-full border-0" srcDoc={document} />
      : <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{read.bodyText || "(Empty message)"}</p>}
    {additional.length > 0
      ? formatted ? <details className="mt-4"><summary className="min-h-11 cursor-pointer content-center text-sm text-muted-foreground">Other links ({additional.length})</summary>{list}</details> : list
      : null}
  </>;
}

/** The message open: its body, links and attachments each reviewed before use, its marks, Archive and Trash, Retry and Ask Alpha. */
function Opened({ runtime, list, onRefresh, onBegin }: { runtime: Runtime; list: Mailbox; onRefresh: (() => void) | undefined; onBegin: (beginning: Beginning) => (() => void) | undefined }) {
  const { state, can, send } = useMessage(runtime);
  const marking = useMarks(runtime);
  const changes = useTimed(runtime, useChanges);
  const remote = usePreferences(runtime).state?.images ?? false;
  const read = state ? mailOf(runtime, (mail) => mail.body(state.body.ticket)) : undefined;
  const reviewLink = useCallback((at: number) => {
    const link = read === undefined ? undefined : prepareMessage(read).links.at(at - 1);
    if (!link || at < 1) return;
    const event = { type: "reviewLink", link: at, secure: link.secure, mismatch: link.mismatch } as const;
    if (can(event)) void send(event);
  }, [can, read, send]);
  if (!state || state.message === 0) return null;
  const access = accessOf(list, state.account);
  const card = mailOf(runtime, (mail) => mail.card(state.message)) ?? read?.message;
  const loaded = state.body.status === "Loaded" && read !== undefined;
  const unread = card?.isUnread ?? false;
  const mark = { type: "mark", access, account: state.account, message: state.message, unread: !unread } as const;
  const retry = { type: "retry", access, remote } as const;
  const reopen = { type: "reopen", access, thread: state.thread, remote } as const;
  const earlier = { type: "earlier", access, remote } as const;
  const newer = { type: "newer", access, remote } as const;
  const history = revisionOf(card);
  const changing = (kind: Change) => {
    const event = changeOf(list, kind, [state.message], history);
    return changes.can(event, "Owner") ? () => void changes.send(event, "Owner") : undefined;
  };
  const fault = state.body.status === "Failed" && state.fault in faultNames ? faultNames[state.fault as keyof typeof faultNames] : undefined;
  const faultAction = fault === "conversationChanged" ? (can(reopen) ? () => void send(reopen) : undefined) : can(retry) ? () => void send(retry) : undefined;
  const told = marking.state?.told;
  const notice = told !== undefined && told in markNotices ? markNotices[told as keyof typeof markNotices] : undefined;
  const files = loaded ? read.attachments : [];
  const unsure = (attachment: number) => state.unsure.some((held) => held.account === state.account && held.message === state.message && held.attachment === attachment);
  const reviewing = (attachment: number, handling: "Opening" | "Saving") => {
    const event = { type: "reviewAttachment", attachment, handling } as const;
    return can(event) ? () => void send(event) : undefined;
  };
  const file = files.at(state.attachment - 1);
  const outcome = state.file.outcome;
  const contents = loaded ? prepareMessage(read) : undefined;
  const link = state.link > 0 ? contents?.links.at(state.link - 1) : undefined;
  const answered = card === undefined ? undefined : { id: card.id, from: card.from, others: [...card.to, ...card.cc], subject: card.subject, files: files.length };
  return (
    <>
      <InboxMessageScreen
        subject={card?.subject || "(no subject)"}
        sender={senderName(card?.from ?? "")}
        address={senderAddress(card?.from ?? "")}
        to={card?.to.join(", ") ?? ""}
        cc={card?.cc.join(", ") || undefined}
        date={card ? new Date(card.receivedAt).toLocaleString() : ""}
        place={state.position + 1}
        count={Math.max(state.thread, 1)}
        onOlder={can(earlier) ? () => void send(earlier) : undefined}
        onNewer={can(newer) ? () => void send(newer) : undefined}
        onClose={() => void send({ type: "close" })}
        reading={state.body.status === "Loading"}
        fault={fault}
        onFaultAction={faultAction}
        fromPhone={state.fromPhone}
        imagesHidden={!imagesLoad(state) && (contents?.formatted?.remoteImages ?? 0) > 0}
        onShowImages={can({ type: "showImages" }) ? () => void send({ type: "showImages" }) : undefined}
        notice={notice}
        onNoticeAction={told === "Unconfirmed" && onRefresh ? onRefresh : undefined}
        attachments={files.map((one, at) => ({
          id: one.partId, name: one.name, size: sizeOf(one.size), onOpen: reviewing(at + 1, "Opening"), onSave: reviewing(at + 1, "Saving"), saveUnconfirmed: unsure(at + 1),
        }))}
        unread={unread}
        onToggleRead={marking.can(mark, "Owner") ? () => void marking.send(mark, "Owner") : undefined}
        onArchive={changing("Archive")}
        onTrash={changing("Trash")}
        onAskAlpha={can({ type: "askAlpha" }) ? () => void send({ type: "askAlpha" }) : undefined}
        onReply={loaded ? onBegin({ kind: "Reply", account: state.account, message: answered }) : undefined}
        onReplyAll={loaded ? onBegin({ kind: "ReplyAll", account: state.account, message: answered }) : undefined}
        onForward={loaded ? onBegin({ kind: "Forward", account: state.account, message: answered }) : undefined}
      >
        {state.fromPhone && card ? <p className="whitespace-pre-wrap break-words">{card.snippet}</p> : null}
        {loaded ? (
          <Body read={read} images={imagesLoad(state)} onReview={reviewLink} />
        ) : null}
      </InboxMessageScreen>
      <InboxLinkReview open={link !== undefined} destination={link?.url ?? ""} claimed={state.warning ? link?.label : undefined} onOpen={() => void send({ type: "openLink" })} onClose={() => void send({ type: "closeLink" })} />
      <InboxAttachmentReview
        open={state.attachment !== 0}
        name={file?.name ?? ""}
        size={sizeOf(file?.size ?? 0)}
        handling={state.handling === "Saving" ? "save" : "open"}
        outcome={outcome === "Planned" ? "review" : outcome === "Recorded" || outcome === "Sent" ? "working" : outcome === "Confirmed" ? "done" : outcome === "Refused" ? "refused" : "unknown"}
        onConfirm={can({ type: "confirmAttachment", access }) ? () => void send({ type: "confirmAttachment", access }) : undefined}
        onClose={() => void send({ type: "closeAttachment" })}
      />
    </>
  );
}

const sizeOf = (bytes: number) => (bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : bytes >= 1_000 ? `${Math.round(bytes / 1_000)} KB` : `${bytes} B`);

/**
 * Inbox: the list of the account, folder and search chosen, saved on the phone while Gmail cannot be reached, and the
 * message opened from it, with the review and Undo of a change. Each control is offered exactly when its machine takes
 * its event.
 * @model spec/app/inbox/index.md
 */
export function Inbox({ runtime }: InboxProps) {
  const { state, cause, can, send } = useList(runtime);
  const message = useMessage(runtime);
  const changes = useTimed(runtime, useChanges);
  const drafts = useDrafts(runtime);
  const shell = useShell(runtime);
  const remote = usePreferences(runtime).state?.images ?? false;
  const [typed, setTyped] = useState<{ text: string; over: string; folder: string } | undefined>();
  const [selection, setSelection] = useState<string>();
  const [choosing, setChoosing] = useState(false);
  const [shelf, setShelf] = useState(false);
  if (cause) return <Alert variant="destructive" className="m-4">Alpha could not open Inbox</Alert>;
  if (!state || !message.state || !drafts.state) return null;
  // spec/app/inbox/drafts.md, "A new message, a reply, a reply to all or a forward begins as [one draft](./letter.md) says; a reply to a message with no usable address is refused and the owner told"
  const onBegin = (beginning: Beginning) => {
    const event = { type: "compose", kind: beginning.kind, account: beginning.account, others: 0, files: 0, mib: 0 } as const;
    return beginning.account !== 0 && drafts.can({ ...event, replyTo: false, addressable: true, forwardable: false, policy: { files: 0, mib: 0 } }, "Owner")
      ? () => void runtime.runPromise(begin(beginning))
      : undefined;
  };
  if (drafts.state.open) return <><Compose runtime={runtime} list={state} /><ChangeReview runtime={runtime} list={state} cards={(number) => mailOf(runtime, (mail) => mail.card(number))} /><FileOffer runtime={runtime} /><Suggested runtime={runtime} /></>;
  const cards = (number: number) => mailOf(runtime, (mail) => mail.card(number));
  const refresh = can({ type: "refresh" }) ? () => void send({ type: "refresh" }) : undefined;
  const retryList = refresh ?? (can({ type: "checkAccess" }) ? () => void send({ type: "checkAccess" }) : undefined);
  const review = <ChangeReview runtime={runtime} list={state} cards={cards} />;
  if (message.state.message !== 0) return <>{<Opened runtime={runtime} list={state} onRefresh={refresh} onBegin={onBegin} />}{review}</>;
  const settings = shell.can({ type: "openView", view: "Settings" }) ? () => void shell.send({ type: "openView", view: "Settings" }) : undefined;
  const hidden = new Set(changes.state ? aside(changes.state) : []);
  const letters = mailOf(runtime, (mail) => mail.shown(state)).filter(({ message: number }) => !hidden.has(number));
  const { account, folder, query } = state.selected;
  const folderKey = `${account}/${folder}`;
  const typedHere = typed && typed.over === query && typed.folder === folderKey ? typed.text : undefined;
  const searching = typedHere !== undefined || query !== "";
  const selecting = selection === folderKey && !searching && readable(state) && !state.saved && state.pages > 0;
  const chosenMessages = new Set(state.chosen);
  const access = accessOf(state, account);
  const today = runtime.runSync(Time.use((time) => time.latest()));
  const checking = state.accounts.status === "Loading";
  const row = ({ message: number, card }: Letter): InboxListRow => {
    const open = { type: "open", access, account, message: number, thread: 1, remote } as const;
    const saved = { type: "openSaved", account, message: number, thread: 1, checking, kept: state.saved } as const;
    const opening = message.can(open) ? open : message.can(saved) ? saved : undefined;
    const chosen = chosenMessages.has(number);
    const toggle = chosen ? ({ type: "unchoose", message: number } as const) : ({ type: "choose", message: number } as const);
    const swipe = { type: "swipe", message: number } as const;
    const canArchive = !selecting && folder !== "Archived" && folder !== "Trashed" && can(swipe) && changes.can(changeOf(state, "Archive", [number], revisionOf(card)), "Owner");
    return {
      id: String(number), sender: folder === "Sent" ? `To: ${card.to.length ? card.to.join(", ") : "(no recipients)"}` : senderName(card.from),
      subject: card.subject || "(no subject)", snippet: card.snippet,
      time: arrived(card.receivedAt, today), unread: card.isUnread, chosen, selecting,
      onOpen: opening ? () => void message.send(opening) : undefined,
      onChosenChange: selecting && can(toggle) ? () => void send(toggle) : undefined,
      onSwipe: canArchive ? () => void send(swipe).then((applied) => {
        if (applied._tag !== "Success") return;
        const archive = changeOf(applied.value.state, "Archive", [number], revisionOf(card));
        if (changes.can(archive, "Owner")) void changes.send(archive, "Owner");
      }) : undefined,
    };
  };
  const chosenChange = (kind: Change) => {
    const event = changeOf(state, kind, [...state.chosen], revisionOf(cards(state.chosen[0] ?? 0)));
    return changes.can(event, "Owner") ? () => void changes.send(event, "Owner") : undefined;
  };
  const kind = letters.length === 0 ? emptyOf(state) : undefined;
  // spec/app/inbox/index.md, "Select all chooses every message the list shows, in one change"
  const chooseAll = { type: "chooseAll", shown: letters.map((letter) => letter.message) } as const;
  const canSearch = readable(state) && searchableIn(folder, state);
  const clearSearch = { type: "clearSearch" } as const;
  const clearSelection = () => {
    for (const message of chosenMessages) void send({ type: "unchoose", message });
  };
  const finishSelection = () => {
    setSelection(undefined);
    clearSelection();
  };
  const accounts = state.connected.map((linked) => ({ id: String(linked.account), email: mailOf(runtime, (mail) => mail.email(linked.account)), grant: linked.grant }));
  const chooseAccount = (id: string) => {
    const event = { type: "chooseAccount", account: Number(id) } as const;
    if (can(event)) {
      setSelection(undefined);
      setTyped(undefined);
      void send(event);
    }
  };
  const mustChoose = state.accounts.status === "Loaded" && account === 0 && state.connected.length > 0;
  return (
    <>
      <InboxListScreen
        account={account === 0 ? undefined : mailOf(runtime, (mail) => mail.email(account))}
        folder={folderNames[folder]}
        unavailable={!state.searchable}
        onChooseFolder={readable(state) ? (name) => {
          const event = { type: "chooseFolder", folder: folderOf[name] } as const;
          if (can(event)) {
            setSelection(undefined);
            setTyped(undefined);
            void send(event);
          }
        } : undefined}
        searching={searching}
        search={typedHere ?? query}
        onOpenSearch={canSearch ? () => {
          finishSelection();
          setTyped({ text: query, over: query, folder: folderKey });
        } : undefined}
        onCloseSearch={() => {
          setTyped(undefined);
          if (can(clearSearch)) void send(clearSearch);
        }}
        onSearchChange={(text) => {
          if (text === "" && can(clearSearch)) {
            setTyped({ text, over: "", folder: folderKey });
            void send(clearSearch);
          } else setTyped({ text, over: query, folder: folderKey });
        }}
        onSearch={canSearch ? (text) => {
          const event = { type: "search", query: text } as const;
          if (can(event)) {
            setTyped(undefined);
            void send(event);
          }
        } : undefined}
        notice={noticeOf(state)}
        onNoticeAction={noticeOf(state) === "reconnect" ? settings : retryList}
        state={mustChoose ? undefined : kind}
        onStateAction={kind === "offline" || kind === "failed" ? retryList : settings}
        chosen={state.chosen.length}
        onStartSelection={!selecting && can(chooseAll) ? () => setSelection(folderKey) : undefined}
        onFinishSelection={selecting || chosenMessages.size > 0 ? finishSelection : undefined}
        onClearSelection={selecting && chosenMessages.size > 0 ? clearSelection : undefined}
        onChooseAll={can(chooseAll) ? () => void send(chooseAll) : undefined}
        onArchive={state.selected.folder === "Archived" ? undefined : chosenChange("Archive")}
        onTrash={state.selected.folder === "Trashed" ? undefined : chosenChange("Trash")}
        onRestore={state.selected.folder === "Archived" ? chosenChange("Unarchive") : state.selected.folder === "Trashed" ? chosenChange("Untrash") : undefined}
        onRefresh={refresh}
        onCompose={onBegin({ kind: "Fresh", account })}
        aside={drafts.state.shelf.shelved.length}
        onShelf={() => setShelf(true)}
        onAccount={state.connected.length > 0 ? () => setChoosing(true) : undefined}
        rows={letters.map(row)}
        loading={state.list.status === "Loading" && !state.further}
        onLoadMore={can({ type: "loadMore" }) ? () => void send({ type: "loadMore" }) : undefined}
        loadingMore={state.list.status === "Loading" && state.further}
      />
      {mustChoose ? <InboxAccountList accounts={accounts} onChoose={chooseAccount} /> : null}
      <InboxAccountSheet open={choosing} onOpenChange={setChoosing} accounts={accounts} selected={String(account)} onChoose={chooseAccount} />
      <Shelf runtime={runtime} open={shelf} onOpenChange={setShelf} />
      <FileOffer runtime={runtime} />
      <Suggested runtime={runtime} />
      {review}
    </>
  );
}
