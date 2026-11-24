// spec/app/inbox/index.md, "Story: See my mail"; spec/app/inbox/message.md, "Story: Read a message"; spec/app/inbox/marking.md, "Story: Mark mail read or unread"
import { Alert, Banner, Button, Checkbox, Chip, ConfirmDialog, EmptyState, ListRow, SearchField, Spinner, cn } from "@repo/ui";
import { Effect, type ManagedRuntime } from "effect";
import { type ReactNode, useState } from "react";
import { type Folder, type Mailbox, accessOf, readable } from "../../gen/app__inbox.ts";
import type { Machine as List } from "../../gen/app__inbox.effect.vibe";
import { useMachine as useList } from "../../gen/app__inbox.react.ts";
import type { Machine as Marks } from "../../gen/app__inbox__marking.effect.vibe";
import { useMachine as useMarks } from "../../gen/app__inbox__marking.react.ts";
import type { Machine as Shown } from "../../gen/app__inbox__message.effect.vibe";
import { imagesLoad } from "../../gen/app__inbox__message.ts";
import { useMachine as useMessage } from "../../gen/app__inbox__message.react.ts";
import type { Machine as Changes } from "../../gen/app__inbox__sending.effect.vibe";
import { aside } from "../../gen/app__inbox__sending.ts";
import { useMachine as useChanges } from "../../gen/app__inbox__sending.react.ts";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import type { Time } from "../runtime/time.vibe";
import { Mail, revisionOf } from "./gmail.vibe";
import { linksOf } from "./links.ts";

export interface InboxProps {
  /** Provides the list, the message open and its marks (`mailbox` of mailbox.vibe, `reading` of message.vibe), and Mail, which holds what Gmail said. */
  runtime: ManagedRuntime.ManagedRuntime<List | Shown | Marks | Changes | Mail | Time, unknown>;
}

const folders: ReadonlyArray<readonly [Folder, string]> = [
  ["Incoming", "Inbox"], ["Starred", "Starred"], ["Sent", "Sent"], ["DraftsFolder", "Drafts"],
  ["AllMail", "All mail"], ["Archived", "Archived"], ["Spam", "Spam"], ["Trashed", "Trash"],
];

/** What the list tells the owner about its state, most pressing first; nothing where all is well. */
function standing(s: Mailbox): ReactNode {
  if (!s.signedIn) return <Banner>Sign in to Alpha Cloud to read your mail</Banner>;
  if (s.accounts.status === "Loaded" && s.selected.account === 0) {
    return <Banner>{s.connected.length === 0 ? "Connect Gmail in Settings to read your mail" : "Choose an account"}</Banner>;
  }
  if (s.failure === "Revoked") return <Banner variant="warn">Reconnect Gmail in Settings</Banner>;
  if (s.accounts.status === "Loaded" && !readable(s)) return <Banner variant="warn">Give Alpha access to read this account in Settings</Banner>;
  if (s.list.status === "Failed") return <Alert variant="warn">{s.failure === "Offline" ? "You are offline" : "Gmail could not be reached"}</Alert>;
  if (s.saved) return <Banner>Saved on this phone</Banner>;
  if (s.moved) return <Banner>Newer mail may be missing. Refresh to see it.</Banner>;
  if (s.doubtful) return <Banner>This list may be out of date. Refresh to see it.</Banner>;
  return null;
}

const faults = {
  Unreachable: "Gmail could not be reached",
  Stale: "This message changed in Gmail",
  TooLarge: "This message is too large to show here. Open it in Gmail.",
  Moved: "This conversation changed",
  Gone: "That message is no longer in Gmail",
  Revoked: "Access to this account was withdrawn",
} as const;

const marks = {
  Busy: "Another change is still in progress",
  Marked: "Done",
  NotMarked: "Gmail did not change it",
  Unconfirmed: "Gmail did not confirm the change. Refresh before trying again.",
} as const;

const kinds = { Archive: "Archive", Trash: "Move to Trash", Unarchive: "Move to Inbox", Untrash: "Take out of Trash" } as const;

/**
 * Archive, Trash and the restore of the folder shown, for the messages chosen: reviewed, held for Undo, and told
 * how they ended.
 */
function Changing({ runtime, list, onHeld }: { runtime: InboxProps["runtime"]; list: Mailbox; onHeld: () => void }) {
  const { state, can, send } = useTimed(runtime, useChanges);
  if (!state) return null;
  const account = list.selected.account;
  const access = accessOf(list, account);
  const messages = [...list.chosen];
  const history = revisionOf(runtime.runSync(Mail.use((mail) => Effect.sync(() => mail.card(messages[0] ?? 0)))));
  const restore: keyof typeof kinds | undefined = list.selected.folder === "Archived" ? "Unarchive" : list.selected.folder === "Trashed" ? "Untrash" : undefined;
  const shown: (keyof typeof kinds)[] = restore ? ["Archive", "Trash", restore] : ["Archive", "Trash"];
  const offered = shown.map((kind) => ({
    kind, event: { type: "prepareChange", kind, access, account, messages, revision: list.revision, history, fresh: list.pages > 0 && !list.saved } as const,
  }));
  const confirm = { type: "confirm", revision: list.revision, access, now: untimed } as const;
  const held = state.kind === "Archive" || state.kind === "Trash";
  const undo = { type: "undo", now: untimed } as const;
  return (
    <div className="flex flex-col gap-2 px-4">
      {state.changed && !state.review.showing && <Alert variant="warn">These emails changed. Select them again.</Alert>}
      {state.attempt.outcome === "Refused" && !state.changed && <Alert variant="warn">Gmail did not change them</Alert>}
      {!state.noticed && (
        <Alert variant="warn">
          Alpha could not confirm the change
          {can({ type: "dismissOutcome" }, "Owner") && <Button variant="ghost" size="sm" onClick={() => void send({ type: "dismissOutcome" }, "Owner")}>OK</Button>}
        </Alert>
      )}
      {can(undo, "Owner") && <Banner action={<Button variant="outline" size="sm" autoFocus onClick={() => void send(undo, "Owner")}>Undo</Button>}>{held && state.kind === "Trash" ? "Moved to Trash" : "Archived"}</Banner>}
      <div className="flex flex-wrap gap-2">
        {!state.review.showing && offered.map(({ kind, event }) => can(event, "Owner") && <Button key={kind} variant="outline" size="sm" onClick={() => void send(event, "Owner")}>{kinds[kind]}</Button>)}
      </div>
      <ConfirmDialog
        open={state.review.showing && !state.draft}
        title={`${kinds[state.kind as keyof typeof kinds] ?? ""}: ${state.messages.length} ${state.messages.length === 1 ? "email" : "emails"}?`}
        confirmLabel={kinds[state.kind as keyof typeof kinds] ?? "OK"}
        onConfirm={() => {
          if (!can(confirm, "Owner")) return;
          void send(confirm, "Owner").then(onHeld);
        }}
        onCancel={() => void send({ type: "cancel" }, "Owner")}
      />
    </div>
  );
}

/** The body of a message with nothing able to run, and its remote images only once they may load. */
function Body({ html, images, text, links }: { html: string | null; images: boolean; text: string; links: ReactNode }) {
  if (html === null) return <><p className="whitespace-pre-wrap break-words">{text}</p>{links}</>;
  const policy = `default-src 'none'; style-src 'unsafe-inline'; img-src ${images ? "https: data:" : "data:"}`;
  return (
    <>
      <iframe title="Message" sandbox="" className="min-h-96 w-full rounded-md bg-background" srcDoc={`<meta http-equiv="Content-Security-Policy" content="${policy}">${html}`} />
      {links}
    </>
  );
}

/** The message open: its body, its links and attachments each reviewed before use, its marks, Retry and Ask Alpha. */
function Opened({ runtime, list }: { runtime: InboxProps["runtime"]; list: Mailbox }) {
  const { state, can, send } = useMessage(runtime);
  const marking = useMarks(runtime);
  if (!state || state.message === 0) return null;
  const access = accessOf(list, state.account);
  const read = runtime.runSync(Mail.use((mail) => Effect.sync(() => mail.body(state.body.ticket))));
  const card = runtime.runSync(Mail.use((mail) => Effect.sync(() => mail.card(state.message))));
  const loaded = state.body.status === "Loaded" && read !== undefined;
  const found = loaded ? linksOf(read.bodyText) : [];
  const unread = card?.isUnread ?? false;
  const mark = { type: "mark", access, account: state.account, message: state.message, unread: !unread } as const;
  return (
    <article aria-label="Message" className="flex flex-col gap-3 p-4">
      <h2 className="text-lg font-medium">{(read?.message ?? card)?.subject ?? ""}</h2>
      <p className="text-sm text-muted-foreground">{(read?.message ?? card)?.from ?? ""}</p>
      {state.fromPhone && <Banner>Saved on this phone</Banner>}
      {state.body.status === "Loading" && <Spinner label="Reading the message" />}
      {state.body.status === "Failed" && <Alert variant="warn">{state.fault === "Fine" ? faults.Unreachable : faults[state.fault]}</Alert>}
      {can({ type: "retry", access, remote: false }) && <Button variant="outline" onClick={() => void send({ type: "retry", access, remote: false })}>Retry</Button>}
      {can({ type: "reopen", access, thread: 1, remote: false }) && <Button variant="outline" onClick={() => void send({ type: "reopen", access, thread: 1, remote: false })}>Open again</Button>}
      {state.fromPhone && card && <p className="whitespace-pre-wrap break-words">{card.snippet}</p>}
      {loaded && (
        <Body
          html={read.bodyHtmlStatus === "available" ? read.bodyHtml : null}
          images={imagesLoad(state)}
          text={read.bodyText}
          links={found.length > 0 && (
            <ul aria-label="Links" className="flex flex-col gap-1">
              {found.map((link, at) => {
                const review = { type: "reviewLink", link: at + 1, secure: link.secure, mismatch: false } as const;
                return <li key={link.url} className="break-all text-sm">{can(review) ? <Button variant="ghost" size="sm" onClick={() => void send(review)}>{link.url}</Button> : link.url}</li>;
              })}
            </ul>
          )}
        />
      )}
      {can({ type: "showImages" }) && <Button variant="outline" onClick={() => void send({ type: "showImages" })}>Show images</Button>}
      {loaded && read.attachments.length > 0 && (
        <ul aria-label="Attachments" className="flex flex-col">
          {read.attachments.map((file, at) => {
            const opening = { type: "reviewAttachment", attachment: at + 1, handling: "Opening" } as const;
            const saving = { type: "reviewAttachment", attachment: at + 1, handling: "Saving" } as const;
            return (
              <ListRow
                key={file.partId}
                title={file.name}
                trailing={<>
                  {can(opening) && <Button variant="ghost" size="sm" onClick={() => void send(opening)}>Open</Button>}
                  {can(saving) && <Button variant="ghost" size="sm" onClick={() => void send(saving)}>Save</Button>}
                </>}
              />
            );
          })}
        </ul>
      )}
      {state.file.outcome === "Refused" && <Alert variant="warn">Alpha could not get that file</Alert>}
      {state.file.outcome === "Unknown" && <Alert variant="warn">Alpha could not confirm the file was saved. Look in Files.</Alert>}
      {marking.state && marking.state.told !== "Quiet" && (
        <Alert variant={marking.state.told === "Marked" ? "ok" : "warn"}>
          {marks[marking.state.told]}
          {marking.can({ type: "dismiss" }, "Owner") && <Button variant="ghost" size="sm" onClick={() => void marking.send({ type: "dismiss" }, "Owner")}>OK</Button>}
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        {marking.can(mark, "Owner") && <Button variant="outline" onClick={() => void marking.send(mark, "Owner")}>{unread ? "Mark read" : "Mark unread"}</Button>}
        {can({ type: "askAlpha" }) && <Button variant="outline" onClick={() => void send({ type: "askAlpha" })}>Ask Alpha</Button>}
        {can({ type: "close" }) && <Button variant="ghost" onClick={() => void send({ type: "close" })}>Back to the list</Button>}
      </div>
      <ConfirmDialog
        open={state.link !== 0}
        title="Open this link?"
        confirmLabel="Open"
        onConfirm={() => void send({ type: "openLink" })}
        onCancel={() => void send({ type: "closeLink" })}
      >
        {found.at(state.link - 1)?.url}
        {state.warning && " The link's text names another address."}
      </ConfirmDialog>
      <ConfirmDialog
        open={state.attachment !== 0 && state.file.outcome === "Planned"}
        title={state.handling === "Saving" ? "Save this file?" : "Open this file?"}
        confirmLabel={state.handling === "Saving" ? "Save" : "Open"}
        onConfirm={() => void send({ type: "confirmAttachment", access })}
        onCancel={() => void send({ type: "closeAttachment" })}
      >
        {read?.attachments.at(state.attachment - 1)?.name}
      </ConfirmDialog>
    </article>
  );
}

/**
 * Inbox: the list of the account, folder and search chosen, saved on the phone while Gmail cannot be reached, and the
 * message opened from it. Each control is offered exactly when its machine takes its event.
 * @model spec/app/inbox/index.md
 */
export function Inbox({ runtime }: InboxProps) {
  const { state, cause, can, send } = useList(runtime);
  const message = useMessage(runtime);
  const changes = useChanges(runtime);
  const [query, setQuery] = useState("");
  if (cause) return <Alert variant="destructive" className="m-4">Alpha could not open Inbox</Alert>;
  if (!state || !message.state) return null;
  const view = message.state;
  const told = view.message === 0 && (view.fault === "Gone" || view.fault === "Revoked") ? <Alert variant="warn">{faults[view.fault]}</Alert> : null;
  if (view.message !== 0) return <Opened runtime={runtime} list={state} />;
  const set = changes.state ? aside(changes.state) : [];
  const letters = runtime.runSync(Mail.use((mail) => Effect.sync(() => mail.shown(state)))).filter(({ message: number }) => !set.includes(number));
  const account = state.selected.account;
  const access = accessOf(state, account);
  const checking = state.accounts.status === "Loading";
  const search = { type: "search", query: query.trim() } as const;
  return (
    <section aria-label="Inbox" className="flex flex-col gap-3 py-2">
      {(state.connected.length >= 2 || (account === 0 && state.connected.length > 0)) && (
        <div role="group" aria-label="Accounts" className="flex flex-wrap gap-2 px-4">
          {state.connected.map((linked) => {
            const choice = { type: "chooseAccount", account: linked.account } as const;
            const email = runtime.runSync(Mail.use((mail) => Effect.sync(() => mail.email(linked.account))));
            return <Button key={linked.account} variant={linked.account === account ? "primary" : "outline"} size="sm" disabled={!can(choice)} onClick={() => void send(choice)}>{email}</Button>;
          })}
        </div>
      )}
      <div className="px-4">{standing(state)}</div>
      {told && <div className="px-4">{told}</div>}
      <Changing runtime={runtime} list={state} onHeld={() => void send({ type: "held" })} />
      {readable(state) && (
        <>
          <div role="group" aria-label="Folders" className="flex gap-2 overflow-x-auto px-4">
            {folders.map(([folder, label]) => (
              <Chip key={folder} pressed={state.selected.folder === folder} disabled={!can({ type: "chooseFolder", folder }) && state.selected.folder !== folder} onPressedChange={() => void send({ type: "chooseFolder", folder })}>{label}</Chip>
            ))}
          </div>
          <form className="px-4" onSubmit={(event) => { event.preventDefault(); if (can(search)) void send(search); }}>
            <SearchField aria-label="Search mail" value={query} onValueChange={setQuery} />
          </form>
        </>
      )}
      {state.list.status === "Loading" && state.pages === 0 && <Spinner label="Reading your mail" className="mx-4" />}
      {state.list.status === "Loaded" && state.pages > 0 && state.total === 0 && <EmptyState title="No mail here" />}
      <ul aria-label="Mail" className="flex flex-col">
        {letters.map(({ message: number, card }) => {
          const open = { type: "open", access, account, message: number, thread: 1, remote: false } as const;
          const saved = { type: "openSaved", account, message: number, thread: 1, checking, kept: state.saved } as const;
          const chosen = state.chosen.includes(number);
          const toggle = chosen ? { type: "unchoose", message: number } as const : { type: "choose", message: number } as const;
          const opening = message.can(open) ? open : message.can(saved) ? saved : undefined;
          return (
            <li key={number} className="flex items-center gap-2 pl-4">
              {can(toggle) && <Checkbox aria-label={`Choose ${card.subject}`} checked={chosen} onCheckedChange={() => void send(toggle)} />}
              <ListRow
                className={cn(card.isUnread && "font-semibold")}
                aria-label={card.subject === "" ? "(no subject)" : card.subject}
                title={card.subject === "" ? "(no subject)" : card.subject}
                detail={`${card.from} · ${card.snippet}`}
                disabled={opening === undefined}
                onClick={() => { if (opening) void message.send(opening); }}
              />
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2 px-4">
        {can({ type: "refresh" }) && <Button variant="outline" onClick={() => void send({ type: "refresh" })}>{state.list.status === "Failed" ? "Retry" : "Refresh"}</Button>}
        {can({ type: "loadMore" }) && <Button variant="outline" onClick={() => void send({ type: "loadMore" })}>More</Button>}
        {state.list.status === "Loading" && state.pages > 0 && <Spinner label="Reading your mail" />}
      </div>
    </section>
  );
}
