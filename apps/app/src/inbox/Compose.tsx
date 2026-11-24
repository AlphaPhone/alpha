// spec/app/inbox/drafts.md, "Story: Write a message"; spec/app/inbox/drafts.md, "Story: Set a draft aside or discard it"; spec/app/inbox/sending.md, "Story: Send a draft I reviewed"
import { Button, InboxComposer, InboxDiscardDialog, InboxDraftReview, InboxFileOfferSheet, InboxSuggestionSheet, type InboxNoticeKind, type InboxSendOutcomeProps, InboxShelfSheet } from "@repo/ui";
import { Effect, type ManagedRuntime } from "effect";
import { useState } from "react";
import { type Mailbox, accessOf } from "../../gen/app__inbox.ts";
import type { Machine as Writing } from "../../gen/app__inbox__drafts.effect.vibe";
import { type Composer, flushed, ready } from "../../gen/app__inbox__drafts.ts";
import { useMachine as useDrafts } from "../../gen/app__inbox__drafts.react.ts";
import { type Letter, canAttach } from "../../gen/app__inbox__letter.ts";
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
import { Letters, type Words, acceptable, policy } from "./composer.vibe";
import { Mail } from "./gmail.vibe";

export interface ComposeProps {
  runtime: ManagedRuntime.ManagedRuntime<Writing | Changes | Adding | Incoming | Offering | Offers | Letters | Mail | Time, unknown>;
  list: Mailbox;
}

const titles = { Fresh: "new", Reply: "reply", ReplyAll: "replyAll", Forward: "forward", Saved: "saved" } as const;

/** How the last operation on `letter` stands, while it is worth telling. */
function outcomeOf(ops: Operations, letter: Letter): InboxSendOutcomeProps["outcome"] | undefined {
  if (ops.draft !== letter.id || ops.kind !== "Send" || ops.of !== ops.session) return undefined;
  const outcome = ops.attempt.outcome;
  if (outcome === "Recorded" || outcome === "Sent") return "sending";
  if (outcome === "Confirmed") return "sent";
  if (outcome === "Refused") return ops.withdrawn ? "stopped" : "refused";
  if (outcome === "Unknown") return "unknown";
  return undefined;
}

const refusals = { TooBig: "fileTooBig", NotReadable: "fileUnreadable", NoRoom: "noRoom" } as const satisfies Partial<Record<Refusal, InboxNoticeKind>>;

const keepingOf = (s: Composer) => (s.unkept ? (s.full ? "full" : "notKept") : s.write.status === "Loading" || s.pending ? "writing" : "kept");

/**
 * The draft open: its recipients, subject, text and files, kept on the phone as it is typed, the review of its send,
 * and the shelf of drafts set aside. Each control is offered exactly when its machine takes its event.
 * @model spec/app/inbox/drafts.md
 */
export function Compose({ runtime, list }: ComposeProps) {
  const { state, can, send } = useTimed(runtime, useDrafts);
  const ops = useTimed(runtime, useChanges);
  const adding = useAdding(runtime);
  const [typing, setTyping] = useState({ to: "", cc: "", bcc: "" });
  if (!state || !ops.state || !adding.state || !state.open) return null;
  const letter = state.letter;
  const draft = letter.id;
  const words = runtime.runSync(Letters.use((all) => Effect.sync(() => all.words(draft))));
  const access = accessOf(list, letter.account);
  const from = runtime.runSync(Mail.use((mail) => Effect.sync(() => mail.email(letter.account))));
  const write = { type: "write", now: untimed } as const;
  const change = (next: Partial<Words>) => {
    if (!can(write, "Owner")) return;
    runtime.runSync(Letters.use((all) => Effect.sync(() => all.set(draft, { ...words, ...next }))));
    void send(write, "Owner");
  };
  const line = (name: "to" | "cc" | "bcc") => ({
    recipients: words[name].map((address) => ({ address, valid: acceptable(address) })),
    value: typing[name],
    onValueChange: (value: string) => setTyping({ ...typing, [name]: value }),
    onAdd: (address: string) => {
      const added = { type: "addRecipient", now: untimed, draft, valid: acceptable(address) } as const;
      if (address === "" || words[name].includes(address) || !can(added, "Owner")) return;
      runtime.runSync(Letters.use((all) => Effect.sync(() => all.set(draft, { ...words, [name]: [...words[name], address] }))));
      setTyping({ ...typing, [name]: "" });
      void send(added, "Owner");
    },
    onRemove: (address: string) => {
      const removed = { type: "removeRecipient", now: untimed, valid: acceptable(address) } as const;
      if (!can(removed, "Owner")) return;
      runtime.runSync(Letters.use((all) => Effect.sync(() => all.set(draft, { ...words, [name]: words[name].filter((one) => one !== address) }))));
      void send(removed, "Owner");
    },
  });
  const kept = state.stored && flushed(state);
  const sending = { type: "prepare", kind: "Send", access, letter, kept, again: false } as const;
  const confirm = { type: "confirm", revision: letter.revision, access, now: untimed } as const;
  const reviewing = ops.state.review.showing && ops.state.draft === draft && ops.state.kind === "Send";
  const outcome = outcomeOf(ops.state, letter);
  const aside = { type: "setAside" } as const;
  // spec/app/inbox/adding.md, "A file is attached to the draft open only once the picker gives one that fits within the room its account leaves; one too large, unreadable or without room is refused and said so"
  const attach = { type: "attach", draft } as const;
  const refused = adding.state.draft === draft && adding.state.refused !== "Accepted" ? refusals[adding.state.refused] : undefined;
  // spec/app/inbox/drafts.md, "A file joins the draft open only within its account's limits, and one is removed with its size"
  const detach = (id: string) => {
    const file = words.files[Number(id)];
    const event = { type: "detach", now: untimed, mib: mibOf(file?.size ?? 0) } as const;
    if (!file || !can(event, "Owner")) return undefined;
    return () => {
      runtime.runSync(Letters.use((all) => Effect.sync(() => all.set(draft, { ...words, files: words.files.filter((_, at) => at !== Number(id)) }))));
      void send(event, "Owner");
    };
  };
  return (
    <>
      <InboxComposer
        kind={titles[letter.kind]}
        accounts={[{ id: String(letter.account), email: from, grant: access.grant }]}
        from={String(letter.account)}
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
        notice={refused}
        outcome={outcome === undefined ? undefined : { outcome }}
        storage={ready(state) ? undefined : state.load.status === "Failed" ? "unavailable" : "checking"}
        onReloadStorage={can({ type: "reload" }, "World") ? () => void send({ type: "reload" }, "World") : undefined}
        keeping={keepingOf(state)}
        gmail={letter.gmail === 0 ? "none" : letter.unsure ? "unsure" : "saved"}
        sent={letter.sent === 0 ? "none" : letter.sent === letter.revision ? "already" : "earlier"}
        onKeepAgain={can({ type: "keepAgain" }, "World") ? () => void send({ type: "keepAgain" }, "World") : undefined}
        onSend={ops.can(sending, "Owner") ? () => void ops.send(sending, "Owner") : undefined}
        onSetAside={can(aside, "Owner") ? () => void send(aside, "Owner") : undefined}
        onDiscard={can({ type: "askDiscard" }, "Owner") ? () => void send({ type: "askDiscard" }, "Owner") : undefined}
      />
      <InboxDraftReview
        open={reviewing}
        operation="send"
        from={from}
        to={words.to.map((address) => ({ address, valid: acceptable(address) }))}
        cc={words.cc.map((address) => ({ address, valid: acceptable(address) }))}
        bcc={words.bcc.map((address) => ({ address, valid: acceptable(address) }))}
        subject={words.subject}
        attachments={words.files.map((file) => file.name)}
        repeat={ops.state.repeat}
        changed={ops.state.changed}
        onConfirm={ops.can(confirm, "Owner") ? () => void ops.send(confirm, "Owner") : undefined}
        onCancel={() => void ops.send({ type: "cancel" }, "Owner")}
      />
      <InboxDiscardDialog
        open={state.discarding}
        gmailCopy={letter.gmail !== 0}
        onDiscard={() => void send({ type: "discard" }, "Owner")}
        onKeep={() => void send({ type: "keepDraft" }, "Owner")}
      />
    </>
  );
}

/** The drafts set aside in this session, each brought back exactly as it was left. */
export function Shelf({ runtime, open, onOpenChange }: { runtime: ComposeProps["runtime"]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { state, can, send } = useDrafts(runtime);
  if (!state) return null;
  const drafts = state.shelf.shelved.map((id) => {
    const words = runtime.runSync(Letters.use((all) => Effect.sync(() => all.words(id))));
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
  const held = runtime.runSync(Incoming.use((files) => Effect.sync(() => files.file())));
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
  if (!state || !drafts.state || state.text === 0) return null;
  const composer = drafts.state;
  const letter = state.target !== "ToDraft" ? undefined : composer.open && composer.letter.id === state.draft ? composer.letter : held(composer.shelf, state.draft);
  const revision = letter?.revision ?? 0;
  const text = runtime.runSync(Offers.use((offers) => Effect.sync(() => offers.text(state.text))));
  const before = letter === undefined ? "" : runtime.runSync(Letters.use((all) => Effect.sync(() => all.words(letter.id).text)));
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
      source={runtime.runSync(Offers.use((offers) => Effect.sync(() => offers.source(state.text))))}
      target={targets[state.target]}
      tooLong={state.blocked}
      onAdd={state.target === "ToDraft" ? using(true) : using(false)}
      onReplace={state.target === "ToDraft" ? using(false) : undefined}
      onDismiss={() => void send({ type: "dismiss" }, "Owner")}
    />
  );
}
