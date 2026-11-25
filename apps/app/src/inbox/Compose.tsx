// spec/app/inbox/drafts.md, "Story: Write a message"; spec/app/inbox/drafts.md, "Story: Set a draft aside or discard it"; spec/app/inbox/sending.md, "Story: Send a draft I reviewed"
import { Button, InboxComposer, InboxDiscardDialog, InboxDraftReview, InboxFileOfferSheet, InboxSuggestionSheet, type InboxNoticeKind, type InboxSendOutcomeProps, InboxShelfSheet } from "@repo/ui";
import { Effect, Exit, type ManagedRuntime } from "effect";
import { useMemo, useSyncExternalStore } from "react";
import { type Mailbox, accessOf } from "../../gen/app__inbox.ts";
import type { Machine as Writing } from "../../gen/app__inbox__drafts.effect.vibe";
import { type Composer, flushed, ready } from "../../gen/app__inbox__drafts.ts";
import { useMachine as useDrafts } from "../../gen/app__inbox__drafts.react.ts";
import { canAttach, mayHaveGone } from "../../gen/app__inbox__letter.ts";
import type { Machine as Adding } from "../../gen/app__inbox__adding.effect.vibe";
import type { Refusal } from "../../gen/app__inbox__adding.ts";
import { useMachine as useAdding } from "../../gen/app__inbox__adding.react.ts";
import type { Machine as Offering } from "../../gen/app__inbox__suggestion.effect.vibe";
import { useMachine as useOffer } from "../../gen/app__inbox__suggestion.react.ts";
import { held } from "../../gen/app__inbox__shelf.ts";
import type { Machine as Changes } from "../../gen/app__inbox__sending.effect.vibe";
import type { Operations } from "../../gen/app__inbox__sending.ts";
import { useMachine as useChanges } from "../../gen/app__inbox__sending.react.ts";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import type { Time } from "../runtime/time.vibe";
import { Incoming, mibOf } from "./adding.vibe";
import { Offers, fits } from "./suggestion.vibe";
import { Letters, type Words, acceptable, backFromDraft, choiceOf, policy, restoreMyEdits, useLatestSavedDraft as takeLatestSavedDraft } from "./composer.vibe";
import { Mail } from "./gmail.vibe";

export interface ComposeProps {
  runtime: ManagedRuntime.ManagedRuntime<Writing | Changes | Adding | Incoming | Offering | Offers | Letters | Mail | Time, unknown>;
  list: Mailbox;
}

const titles = { Fresh: "new", Reply: "reply", ReplyAll: "replyAll", Forward: "forward", Saved: "saved" } as const;
const emptyAddressFields = { to: "", cc: "", bcc: "" } as const;

/** How the last operation on `letter` stands, while it is worth telling. */
function outcomeOf(ops: Operations, state: Composer): InboxSendOutcomeProps["outcome"] | undefined {
  const { letter } = state;
  if (ops.draft === letter.id && ops.kind === "Send" && ops.of === ops.session) {
    const outcome = ops.attempt.outcome;
    if (outcome === "Recorded" || outcome === "Sent") return "sending";
    if (outcome === "Confirmed") return "sent";
    if (outcome === "Refused") return ops.withdrawn ? "stopped" : "refused";
    if (outcome === "Unknown") return "unknown";
  }
  if (letter.doubt.attempt !== 0) return "unknown";
  if (state.check.status === "Loaded" && state.checked.length > 0 && letter.sent > 0) return "foundSent";
  if (state.check.status === "Loaded" && state.checked.length > 0 && letter.sent === 0) return "notSent";
  return undefined;
}

const refusals = { TooBig: "fileTooBig", NotReadable: "fileUnreadable", NoRoom: "noRoom" } as const satisfies Partial<Record<Refusal, InboxNoticeKind>>;

const keepingOf = (s: Composer) => (s.unkept ? (s.full ? "full" : "notKept") : s.write.status === "Loading" || s.pending ? "writing" : "kept");

function useLettersStore(runtime: ComposeProps["runtime"]) {
  const store = useMemo(() => runtime.runSync(Effect.flatMap(Letters, (all) => Effect.succeed(all))), [runtime]);
  useSyncExternalStore((listener) => store.subscribe(listener), () => store.version(), () => store.version());
  return store;
}

/**
 * The draft open: its recipients, subject, text and files, kept on the phone as it is typed, the review of its send,
 * and the shelf of drafts set aside. Each control is offered exactly when its machine takes its event.
 * @model spec/app/inbox/drafts.md
 */
export function Compose({ runtime, list }: ComposeProps) {
  const { state, can, send } = useTimed(runtime, useDrafts);
  const ops = useTimed(runtime, useChanges);
  const adding = useAdding(runtime);
  const lettersStore = useLettersStore(runtime);
  if (!state || !ops.state || !adding.state || !state.open) return null;
  const letter = state.letter;
  const draft = letter.id;
  const words = lettersStore.words(draft);
  const typing = words.pending ?? emptyAddressFields;
  const access = accessOf(list, letter.account);
  const from = runtime.runSync(Effect.flatMap(Mail, (mail) => Effect.sync(() => mail.email(letter.account))));
  const write = { type: "write", now: untimed } as const;
  const change = (next: Partial<Words>) => {
    if (!can(write, "Owner")) return;
    const before = lettersStore.words(draft);
    lettersStore.set(draft, { ...before, ...next });
    void send(write, "Owner").then((outcome) => {
      if (Exit.isFailure(outcome)) lettersStore.set(draft, before);
    });
  };
  const line = (name: "to" | "cc" | "bcc") => ({
    recipients: words[name].map((address) => ({ address, valid: acceptable(address) })),
    value: typing[name],
    onValueChange: (value: string) => change({ pending: { ...typing, [name]: value } }),
    onAdd: (address: string) => {
      const added = { type: "addRecipient", now: untimed, draft, valid: acceptable(address) } as const;
      if (address === "") return;
      const pending = { ...typing, [name]: "" };
      if (words[name].includes(address)) {
        change({ pending });
        return;
      }
      if (!can(added, "Owner")) return;
      const before = lettersStore.words(draft);
      lettersStore.set(draft, { ...before, [name]: [...words[name], address], pending });
      void send(added, "Owner").then((outcome) => {
        if (Exit.isFailure(outcome)) lettersStore.set(draft, before);
      });
    },
    onRemove: (address: string) => {
      const removed = { type: "removeRecipient", now: untimed, valid: acceptable(address) } as const;
      if (!can(removed, "Owner")) return;
      const before = lettersStore.words(draft);
      lettersStore.set(draft, { ...before, [name]: words[name].filter((one) => one !== address) });
      void send(removed, "Owner").then((outcome) => {
        if (Exit.isFailure(outcome)) lettersStore.set(draft, before);
      });
    },
  });
  const kept = state.stored && flushed(state);
  const addressed = Object.values(typing).every((value) => value.trim() === "");
  const changeFrom = (account: number) => ({ type: "changeFrom", account, access: accessOf(list, account), typing: !addressed }) as const;
  const accounts = runtime.runSync(Effect.flatMap(Mail, (mail) => Effect.sync(() => [
    { id: String(letter.account), email: from, grant: access.grant },
    ...list.connected.filter(({ account }) => can(changeFrom(account), "Owner")).map(({ account, grant }) => ({ id: String(account), email: mail.email(account), grant })),
  ])));
  const sending = { type: "prepare", kind: "Send", access, letter, kept: kept && addressed, again: false } as const;
  const sendingAgain = { type: "prepare", kind: "Send", access, letter, kept: kept && addressed, again: true } as const;
  // spec/app/inbox/sending.md, "Story: Save my draft to Gmail, or delete it there, knowingly"
  const saving = { type: "prepare", kind: letter.gmail === 0 ? "SaveDraft" : "ReplaceDraft", access, letter, kept: kept && addressed, again: false } as const;
  const lookUp = { type: "lookUp", access } as const;
  const checkCopy = kept && addressed && can(lookUp, "Owner") ? () => void send(lookUp, "Owner") : undefined;
  const checkSent = { type: "checkSent", draft, access } as const;
  const clash = letter.draft.sync === "Conflicted";
  const copy = clash ? lettersStore.copy(letter.gmail) : undefined;
  const latest = choiceOf(copy);
  const gmail = clash ? "clash" : letter.unsure ? "unsure" : letter.draft.sync === "Saving" ? "saving" : letter.gmail === 0 ? "none" : letter.draft.sync === "Edited" ? "unsaved" : "saved";
  const deleting = { type: "prepare", kind: "DeleteDraft", access, letter, kept, again: false } as const;
  const confirm = { type: "confirm", revision: letter.revision, access, now: untimed } as const;
  const reviewAgain = { type: "reviewAgain", letter, kept: kept && addressed } as const;
  const turnOnSending = { type: "turnOnSending", account: letter.account, access } as const;
  const cancelReview = { type: "cancel" } as const;
  const dismissOutcome = { type: "dismissOutcome" } as const;
  const discardDraft = { type: "discard" } as const;
  const keepDraft = { type: "keepDraft" } as const;
  const reviewed = ops.state.kind === "Send" || ops.state.kind === "SaveDraft" || ops.state.kind === "ReplaceDraft" || ops.state.kind === "DeleteDraft";
  const reviewing = ops.state.review.showing && ops.state.draft === draft && reviewed;
  const confirming = ops.state.draft === draft && (ops.state.attempt.outcome === "Recorded" || ops.state.attempt.outcome === "Sent");
  const outcomeKind = outcomeOf(ops.state, state);
  const outcomeProps: InboxSendOutcomeProps | undefined = outcomeKind === undefined ? undefined : {
    outcome: outcomeKind,
    checking: state.check.status === "Loading",
    onCheckSent: can(checkSent, "Owner") ? () => void send(checkSent, "Owner") : undefined,
    onSendAgain: mayHaveGone(letter) && ops.can(sendingAgain, "Owner") ? () => void ops.send(sendingAgain, "Owner") : undefined,
    onDismiss: ops.can(dismissOutcome, "Owner") ? () => void ops.send(dismissOutcome, "Owner") : undefined,
  };
  const aside = { type: "setAside" } as const;
  // spec/app/inbox/adding.md, "A file is attached to the draft open only once the picker gives one that fits within the room its account leaves; one too large, unreadable or without room is refused and said so"
  const attach = { type: "attach", draft } as const;
  const refused = adding.state.draft === draft && adding.state.refused !== "Accepted" ? refusals[adding.state.refused] : undefined;
  const notice: InboxNoticeKind | undefined = refused
    ?? (state.lookup.status === "Failed" ? "unreachable"
      : state.notice === "MineRestored" ? "mineRestored"
      : state.notice === "SavedTaken" ? "savedTaken"
      : state.notice === "SaveFound" ? "saveFound"
      : state.notice === "SaveNotFound" ? "saveNotFound"
      : letter.textOnly ? "forwardTextOnly"
      : !access.grant.send && ops.can(turnOnSending, "Owner") ? "sendingOff"
      : undefined);
  const onNoticeAction = notice === "unreachable" ? checkCopy
    : notice === "sendingOff" && ops.can(turnOnSending, "Owner") ? () => void ops.send(turnOnSending, "Owner")
    : undefined;
  // spec/app/inbox/drafts.md, "A file joins the draft open only within its account's limits, and one is removed with its size"
  const detach = (id: string) => {
    const file = words.files[Number(id)];
    const event = { type: "detach", now: untimed, mib: mibOf(file?.size ?? 0) } as const;
    if (!file || !can(event, "Owner")) return undefined;
    return () => {
      const before = lettersStore.words(draft);
      lettersStore.set(draft, { ...before, files: before.files.filter((_, at) => at !== Number(id)) });
      void send(event, "Owner").then((outcome) => {
        if (Exit.isFailure(outcome)) lettersStore.set(draft, before);
      });
    };
  };
  const sendAction = ops.can(sending, "Owner")
    ? () => void ops.send(sending, "Owner")
    : mayHaveGone(letter) && ops.can(sendingAgain, "Owner")
      ? () => void ops.send(sendingAgain, "Owner")
      : undefined;
  return (
    <>
      <InboxComposer
        kind={titles[letter.kind]}
        accounts={accounts}
        from={String(letter.account)}
        onFromChange={accounts.length > 1 ? (id) => {
          const event = changeFrom(Number(id));
          if (can(event, "Owner")) void send(event, "Owner");
        } : undefined}
        to={line("to")}
        cc={line("cc")}
        bcc={line("bcc")}
        subject={words.subject}
        onSubjectChange={(subject) => change({ subject })}
        text={words.text}
        onTextChange={(text) => change({ text })}
        attachments={words.files.map((file, at) => ({ id: String(at), name: file.name }))}
        onRemoveAttachment={(id) => detach(id)?.()}
        onAttach={adding.can(attach) && canAttach(letter, policy, 1) ? () => void adding.send(attach) : undefined}
        notice={notice}
        onNoticeAction={onNoticeAction}
        outcome={outcomeProps}
        storage={ready(state) ? undefined : state.load.status === "Failed" ? "unavailable" : "checking"}
        onReloadStorage={can({ type: "reload" }, "World") ? () => void send({ type: "reload" }, "World") : undefined}
        keeping={keepingOf(state)}
        gmail={gmail}
        clash={clash}
        onRestoreMine={copy?.seen && can({ type: "restoreMine" }, "Owner") ? () => void runtime.runPromise(restoreMyEdits()) : undefined}
        onUseSaved={latest && can(latest, "Owner") ? () => void runtime.runPromise(takeLatestSavedDraft()) : undefined}
        sent={letter.sent === 0 ? "none" : letter.sent === letter.revision ? "already" : "earlier"}
        onKeepAgain={can({ type: "keepAgain" }, "World") ? () => void send({ type: "keepAgain" }, "World") : undefined}
        onSend={sendAction}
        onSaveToGmail={ops.can(saving, "Owner") ? () => void ops.send(saving, "Owner") : undefined}
        onCheckCopy={checkCopy}
        onDeleteGmailCopy={ops.can(deleting, "Owner") ? () => void ops.send(deleting, "Owner") : undefined}
        onSetAside={ready(state) && (can(aside, "Owner") || state.pending || state.unkept || state.write.status === "Loading") ? () => void runtime.runPromise(backFromDraft) : undefined}
        onDiscard={can({ type: "askDiscard" }, "Owner") ? () => void send({ type: "askDiscard" }, "Owner") : undefined}
      />
      <InboxDraftReview
        open={reviewing}
        operation={ops.state.kind === "SaveDraft" ? "save" : ops.state.kind === "ReplaceDraft" ? "replace" : ops.state.kind === "DeleteDraft" ? "deleteCopy" : "send"}
        from={from}
        to={words.to.map((address) => ({ address, valid: acceptable(address) }))}
        cc={words.cc.map((address) => ({ address, valid: acceptable(address) }))}
        bcc={words.bcc.map((address) => ({ address, valid: acceptable(address) }))}
        subject={words.subject}
        text={words.text}
        attachments={words.files.map((file) => file.name)}
        repeat={ops.state.repeat}
        changed={ops.state.changed}
        confirming={confirming}
        onConfirm={ops.can(confirm, "Owner") ? () => void ops.send(confirm, "Owner") : undefined}
        onReviewAgain={ops.can(reviewAgain, "Owner") ? () => void ops.send(reviewAgain, "Owner") : undefined}
        onCancel={() => { if (ops.can(cancelReview, "Owner")) void ops.send(cancelReview, "Owner"); }}
      />
      <InboxDiscardDialog
        open={state.discarding}
        gmailCopy={letter.gmail !== 0}
        onDiscard={() => { if (can(discardDraft, "Owner")) void send(discardDraft, "Owner"); }}
        onKeep={() => { if (can(keepDraft, "Owner")) void send(keepDraft, "Owner"); }}
      />
    </>
  );
}

/** The drafts set aside in this session, each brought back exactly as it was left. */
export function Shelf({ runtime, open, onOpenChange }: { runtime: ComposeProps["runtime"]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { state, can, send } = useDrafts(runtime);
  const lettersStore = useLettersStore(runtime);
  if (!state) return null;
  const drafts = state.shelf.shelved.map((id) => {
    const words = lettersStore.words(id);
    return { id: String(id), to: words.to.join(", ") || "No recipient", subject: words.subject || words.text.slice(0, 60) };
  });
  return (
    <InboxShelfSheet
      open={open}
      onOpenChange={onOpenChange}
      drafts={drafts}
      onResume={(id) => {
        const event = { type: "resume", draft: Number(id) } as const;
        if (can(event, "Owner")) void send(event, "Owner");
      }}
    />
  );
}

/**
 * A file another part of Alpha handed to Inbox, shown before it joins the draft open or starts a new message.
 * @model spec/app/inbox/adding.md
 */
export function FileOffer({ runtime }: { runtime: ComposeProps["runtime"] }) {
  const { state, can, send } = useAdding(runtime);
  const drafts = useDrafts(runtime);
  if (!state || !drafts.state) return null;
  const held = runtime.runSync(Effect.flatMap(Incoming, (files) => Effect.sync(() => files.file())));
  const open = state.thing !== 0 && held !== undefined && held.source !== "Picker";
  const room = state.into === 0 || (drafts.state.open && drafts.state.letter.id === state.into && canAttach(drafts.state.letter, policy, state.mib));
  const takeIn = { type: "takeIn", room } as const;
  return (
    <InboxFileOfferSheet
      open={open}
      name={held?.attached.name ?? ""}
      size={`${state.mib} MB`}
      source={held?.source === "Photos" ? "Photos" : "Files"}
      into={state.into === 0 ? "new" : "draft"}
      onTakeIn={() => {
        if (can(takeIn)) void send(takeIn);
      }}
      onLeaveOut={() => {
        if (can({ type: "leaveOut" })) void send({ type: "leaveOut" });
      }}
    />
  );
}

const targets = { ToDraft: "draft", NewReply: "newReply", NewEmail: "newEmail" } as const;

/**
 * Text offered into an email: Alpha's suggestion for a draft, or text handed over with "Use in email", shown against
 * the draft as it is now before it goes in, added or in place of its text.
 * @model spec/app/inbox/suggestion.md
 */
export function Suggested({ runtime }: { runtime: ComposeProps["runtime"] }) {
  const { state, can, send } = useOffer(runtime);
  const drafts = useDrafts(runtime);
  const lettersStore = useLettersStore(runtime);
  if (!state || !drafts.state || state.text === 0) return null;
  const composer = drafts.state;
  const letter = state.target !== "ToDraft" ? undefined : composer.open && composer.letter.id === state.draft ? composer.letter : held(composer.shelf, state.draft);
  const revision = letter?.revision ?? 0;
  const text = runtime.runSync(Effect.flatMap(Offers, (offers) => Effect.sync(() => offers.text(state.text))));
  const account = runtime.runSync(Effect.flatMap(Mail, (mail) => Effect.sync(() => mail.email(letter?.account ?? state.account))));
  const before = letter === undefined ? "" : lettersStore.words(letter.id).text;
  const review = { type: "review", revision } as const;
  // spec/app/inbox/suggestion.md, "Only the owner puts it in, once, as it was last shown, into the draft as it still is, adding or replacing as the owner chooses; text that does not fit is refused whole and the offer stays"
  const using = (appends: boolean) => {
    const event = { type: "use", revision, appends, fits: fits(before, text, appends) } as const;
    return can(event, "Owner") ? () => void send(event, "Owner") : undefined;
  };
  if (!state.review.showing) {
    return can(review, "Owner") ? <Button variant="secondary" size="sm" className="m-4 self-start" onClick={() => void send(review, "Owner")}>Review email suggestion</Button> : null;
  }
  return (
    <InboxSuggestionSheet
      open
      text={text}
      from={state.from === "Agent" ? "alpha" : "owner"}
      source={runtime.runSync(Effect.flatMap(Offers, (offers) => Effect.sync(() => offers.source(state.text))))}
      account={account}
      target={targets[state.target]}
      tooLong={state.blocked}
      onAdd={state.target === "ToDraft" ? using(true) : using(false)}
      onReplace={state.target === "ToDraft" ? using(false) : undefined}
      onDismiss={() => { if (can({ type: "dismiss" }, "Owner")) void send({ type: "dismiss" }, "Owner"); }}
    />
  );
}
