// spec/app/inbox/index.md, "Story: See my mail"; spec/app/inbox/message.md, "Story: Read a message"; spec/app/inbox/marking.md, "Story: Mark mail read or unread"; spec/app/inbox/sending.md, "Story: Archive or trash mail, with Undo"
import {
  Alert, Button, InboxAccountList, InboxAccountSheet, InboxAttachmentReview, InboxChangeReview, InboxChangeToast, type InboxFolder,
  InboxLinkReview, type InboxListRow, InboxListScreen, type InboxListStateKind, InboxMessageScreen, type InboxMessageFaultKind,
  type InboxNoticeKind, ToastRegion,
} from "@repo/ui";
import type { MailCard, MailMessage } from "@elizaos/cloud/client";
import { Effect, type ManagedRuntime } from "effect";
import { type ReactNode, useState } from "react";
import { type Folder, type Mailbox, accessOf, readable, searchableIn } from "../../gen/app__inbox.ts";
import type { Machine as List } from "../../gen/app__inbox.effect.vibe";
import { useMachine as useList } from "../../gen/app__inbox.react.ts";
import type { Machine as Marks } from "../../gen/app__inbox__marking.effect.vibe";
import { useMachine as useMarks } from "../../gen/app__inbox__marking.react.ts";
import type { Fault, MessageView } from "../../gen/app__inbox__message.ts";
import type { Machine as Shown } from "../../gen/app__inbox__message.effect.vibe";
import { imagesLoad } from "../../gen/app__inbox__message.ts";
import { useMachine as useMessage } from "../../gen/app__inbox__message.react.ts";
import type { Machine as Changes } from "../../gen/app__inbox__sending.effect.vibe";
import { type Kind, type Operations, aside } from "../../gen/app__inbox__sending.ts";
import { useMachine as useChanges } from "../../gen/app__inbox__sending.react.ts";
import type { Machine as Shell } from "../../gen/app__shell.effect.vibe";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { Time } from "../runtime/time.vibe";
import { type Letter, Mail, revisionOf } from "./gmail.vibe";
import { linksOf } from "./links.ts";

export interface InboxProps {
  /** Provides the list, the message open and its marks, the changes, the shell, and Mail, which holds what Gmail said. */
  runtime: ManagedRuntime.ManagedRuntime<List | Shown | Marks | Changes | Shell | Mail | Time, unknown>;
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
function Body({ read, images, view, onReview }: { read: MailMessage; images: boolean; view: MessageView; onReview: (link: number, secure: boolean) => (() => void) | undefined }) {
  const found = linksOf(read.bodyText);
  const links = found.length > 0 && (
    <ul aria-label="Links" className="flex flex-col gap-1">
      {found.map((link, at) => {
        const review = onReview(at + 1, link.secure);
        return <li key={link.url} className="text-sm break-all">{review ? <Button variant="ghost" size="sm" onClick={review}>{link.url}</Button> : link.url}</li>;
      })}
    </ul>
  );
  if (read.bodyHtmlStatus !== "available" || read.bodyHtml === null) return <><p className="whitespace-pre-wrap break-words">{read.bodyText}</p>{links}</>;
  const policy = `default-src 'none'; style-src 'unsafe-inline'; img-src ${images ? "https: data:" : "data:"}`;
  return (
    <>
      <iframe key={`${view.message}/${String(images)}`} title="Message" sandbox="" className="min-h-96 w-full rounded-md bg-background" srcDoc={`<meta http-equiv="Content-Security-Policy" content="${policy}">${read.bodyHtml}`} />
      {links}
    </>
  );
}

/** The message open: its body, links and attachments each reviewed before use, its marks, Archive and Trash, Retry and Ask Alpha. */
function Opened({ runtime, list, onRefresh }: { runtime: Runtime; list: Mailbox; onRefresh: (() => void) | undefined }) {
  const { state, can, send } = useMessage(runtime);
  const marking = useMarks(runtime);
  const changes = useTimed(runtime, useChanges);
  if (!state || state.message === 0) return null;
  const access = accessOf(list, state.account);
  const read = mailOf(runtime, (mail) => mail.body(state.body.ticket));
  const card = read?.message ?? mailOf(runtime, (mail) => mail.card(state.message));
  const loaded = state.body.status === "Loaded" && read !== undefined;
  const unread = card?.isUnread ?? false;
  const mark = { type: "mark", access, account: state.account, message: state.message, unread: !unread } as const;
  const retry = { type: "retry", access, remote: false } as const;
  const reopen = { type: "reopen", access, thread: 1, remote: false } as const;
  const earlier = { type: "earlier", access, remote: false } as const;
  const newer = { type: "newer", access, remote: false } as const;
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
  const link = loaded ? linksOf(read.bodyText).at(state.link - 1) : undefined;
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
        imagesHidden={!imagesLoad(state)}
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
      >
        {state.fromPhone && card ? <p className="whitespace-pre-wrap break-words">{card.snippet}</p> : null}
        {loaded ? (
          <Body read={read} images={imagesLoad(state)} view={state} onReview={(at, secure) => {
            const review = { type: "reviewLink", link: at, secure, mismatch: false } as const;
            return can(review) ? () => void send(review) : undefined;
          }} />
        ) : null}
      </InboxMessageScreen>
      <InboxLinkReview open={state.link !== 0} destination={link?.url ?? ""} onOpen={() => void send({ type: "openLink" })} onClose={() => void send({ type: "closeLink" })} />
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
  const shell = useShell(runtime);
  const [query, setQuery] = useState("");
  const [choosing, setChoosing] = useState(false);
  if (cause) return <Alert variant="destructive" className="m-4">Alpha could not open Inbox</Alert>;
  if (!state || !message.state) return null;
  const cards = (number: number) => mailOf(runtime, (mail) => mail.card(number));
  const refresh = can({ type: "refresh" }) ? () => void send({ type: "refresh" }) : undefined;
  const review = <ChangeReview runtime={runtime} list={state} cards={cards} />;
  if (message.state.message !== 0) return <>{<Opened runtime={runtime} list={state} onRefresh={refresh} />}{review}</>;
  const settings = shell.can({ type: "openView", view: "Settings" }) ? () => void shell.send({ type: "openView", view: "Settings" }) : undefined;
  const held = changes.state ? aside(changes.state) : [];
  const letters = mailOf(runtime, (mail) => mail.shown(state)).filter(({ message: number }) => !held.includes(number));
  const account = state.selected.account;
  const access = accessOf(state, account);
  const today = runtime.runSync(Time.use((time) => time.latest()));
  const checking = state.accounts.status === "Loading";
  const row = ({ message: number, card }: Letter): InboxListRow => {
    const open = { type: "open", access, account, message: number, thread: 1, remote: false } as const;
    const saved = { type: "openSaved", account, message: number, thread: 1, checking, kept: state.saved } as const;
    const opening = message.can(open) ? open : message.can(saved) ? saved : undefined;
    const chosen = state.chosen.includes(number);
    const toggle = chosen ? ({ type: "unchoose", message: number } as const) : ({ type: "choose", message: number } as const);
    const swipe = { type: "swipe", message: number } as const;
    return {
      id: String(number), sender: senderName(card.from), subject: card.subject || "(no subject)", snippet: card.snippet,
      time: arrived(card.receivedAt, today), unread: card.isUnread, chosen,
      onOpen: opening ? () => void message.send(opening) : undefined,
      onChosenChange: can(toggle) ? () => void send(toggle) : undefined,
      onSwipe: can(swipe) ? () => void send(swipe).then(() => {
        const archive = changeOf({ ...state, chosen: [number], revision: state.revision + 1 }, "Archive", [number], revisionOf(card));
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
  const accounts = state.connected.map((linked) => ({ id: String(linked.account), email: mailOf(runtime, (mail) => mail.email(linked.account)), grant: linked.grant }));
  const chooseAccount = (id: string) => {
    const event = { type: "chooseAccount", account: Number(id) } as const;
    if (can(event)) void send(event);
  };
  const mustChoose = state.accounts.status === "Loaded" && account === 0 && state.connected.length > 0;
  return (
    <>
      <InboxListScreen
        account={account === 0 ? undefined : mailOf(runtime, (mail) => mail.email(account))}
        folder={folderNames[state.selected.folder]}
        unavailable={!state.searchable}
        onChooseFolder={readable(state) ? (name) => {
          const event = { type: "chooseFolder", folder: folderOf[name] } as const;
          if (can(event)) void send(event);
        } : undefined}
        search={query}
        onSearchChange={setQuery}
        onSearch={readable(state) && searchableIn(state.selected.folder, state) ? (text) => {
          const event = { type: "search", query: text } as const;
          if (can(event)) void send(event);
        } : undefined}
        notice={noticeOf(state)}
        onNoticeAction={noticeOf(state) === "reconnect" ? settings : refresh}
        state={mustChoose ? undefined : kind}
        onStateAction={kind === "offline" || kind === "failed" ? refresh : settings}
        chosen={state.chosen.length}
        onChooseAll={can(chooseAll) ? () => void send(chooseAll) : undefined}
        onArchive={state.selected.folder === "Archived" ? undefined : chosenChange("Archive")}
        onTrash={state.selected.folder === "Trashed" ? undefined : chosenChange("Trash")}
        onRestore={state.selected.folder === "Archived" ? chosenChange("Unarchive") : state.selected.folder === "Trashed" ? chosenChange("Untrash") : undefined}
        onRefresh={refresh}
        onAccount={state.connected.length > 0 ? () => setChoosing(true) : undefined}
        rows={letters.map(row)}
        loading={state.list.status === "Loading" && !state.further}
        onLoadMore={can({ type: "loadMore" }) ? () => void send({ type: "loadMore" }) : undefined}
        loadingMore={state.list.status === "Loading" && state.further}
      />
      {mustChoose ? <InboxAccountList accounts={accounts} onChoose={chooseAccount} /> : null}
      <InboxAccountSheet open={choosing} onOpenChange={setChoosing} accounts={accounts} selected={String(account)} onChoose={chooseAccount} />
      {review}
    </>
  );
}
