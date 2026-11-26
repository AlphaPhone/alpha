// spec/app/inbox/drafts.md, "Story: Write a message"; spec/app/inbox/drafts.md, "Story: Set a draft aside or discard it"; spec/app/inbox/sending.md, "Story: Send a draft I reviewed"
import { Button, InboxComposer, InboxDiscardDialog, InboxDraftReview, InboxFileOfferSheet, InboxSuggestionSheet, type InboxNoticeKind, type InboxSendOutcomeProps } from "@repo/ui";
import { Effect, type ManagedRuntime } from "effect";
import { useMemo } from "react";
import { type Mailbox, accessOf } from "../../gen/app__inbox.ts";
import type { Machine as Writing } from "../../gen/app__inbox__drafts.effect.vibe";
import { type Composer, flushed, ready } from "../../gen/app__inbox__drafts.ts";
import { useMachine as useDrafts } from "../../gen/app__inbox__drafts.react.ts";
import { type Letter, canAttach } from "../../gen/app__inbox__letter.ts";
import type { Machine as Adding } from "../../gen/app__inbox__adding.effect.vibe";
import type { Refusal } from "../../gen/app__inbox__adding.ts";
import { useMachine as useAdding } from "../../gen/app__inbox__adding.react.ts";
import { available } from "../../gen/app__shell.ts";
import type { Machine as Shell } from "../../gen/app__shell.effect.vibe";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import type { Machine as Offering } from "../../gen/app__inbox__suggestion.effect.vibe";
import { useMachine as useOffer } from "../../gen/app__inbox__suggestion.react.ts";
import { held } from "../../gen/app__inbox__shelf.ts";
import type { Machine as Changes } from "../../gen/app__inbox__sending.effect.vibe";
import type { Operations } from "../../gen/app__inbox__sending.ts";
import { useMachine as useChanges } from "../../gen/app__inbox__sending.react.ts";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import type { Time } from "../runtime/time.vibe";
import type { Telephony } from "../platform/telephony.vibe";
import { ContactAddresses, Incoming, pickPeople } from "./adding.vibe";
import { Offers, fits } from "./suggestion.vibe";
import { Letters, type Words, acceptable, backFromDraft, choiceOf, mibOf, policy, restoreMyEdits, chooseLatestSavedDraft } from "./composer.vibe";
import { Mail } from "./gmail.vibe";
import { MailSignIn } from "./mailbox.vibe";
import { gmailAuthorizationWindow } from "./authorization.vibe";

export interface ComposeProps {
  runtime: ManagedRuntime.ManagedRuntime<Writing | Changes | Adding | Incoming | ContactAddresses | Offering | Offers | Letters | Mail | Time | Shell | Telephony | MailSignIn, unknown>;
  list: Mailbox;
}

const titles = { Fresh: "new", Reply: "reply", ReplyAll: "replyAll", Forward: "forward", Saved: "saved" } as const;
const emptyAddressFields = { to: "", cc: "", bcc: "" } as const;

function correspondents(read: ReturnType<Mail.Shape["shown"]>): { name: string; email: string }[] {
  const addresses = new Map<string, { name: string; email: string }>();
  for (const { card } of read) {
    for (const person of [card.from, ...card.to, ...card.cc]) {
      const email = /<([^>]+)>/u.exec(person)?.[1] ?? person.trim();
      const key = email.toLowerCase();
      if (acceptable(email) && !addresses.has(key)) {
        addresses.set(key, { name: person.replace(/<[^>]*>/u, "").replace(/"/gu, "").trim() || email, email });
      }
    }
  }
  return [...addresses.values()];
}

/** How the last operation on `letter` stands, while it is worth telling. */
function outcomeOf(ops: Operations, letter: Letter): InboxSendOutcomeProps["outcome"] | undefined {
  if (ops.draft !== letter.id || ops.kind !== "Send" || ops.of !== ops.session) return letter.doubt.attempt !== 0 ? "unknown" : undefined;
  const outcome = ops.attempt.outcome;
  if (outcome === "Recorded" || outcome === "Sent") return "sending";
  if (outcome === "Confirmed") return "sent";
  if (outcome === "Refused") return ops.withdrawn ? "stopped" : "refused";
  if (outcome === "Unknown") return "unknown";
  return undefined;
}

const refusals = { TooBig: "fileTooBig", NotReadable: "fileUnreadable", NoRoom: "noRoom" } as const satisfies Partial<Record<Refusal, InboxNoticeKind>>;
const notices: Partial<Record<Composer["notice"], InboxNoticeKind>> = {
  MineRestored: "mineRestored", SavedTaken: "savedTaken", SaveFound: "saveFound", SaveNotFound: "saveNotFound",
  CopyDeleted: "copyDeleted", CopyNotDeleted: "copyNotDeleted",
};

const keepingOf = (s: Composer) => (s.unkept ? (s.full ? "full" : "notKept") : s.write.status === "Loading" || s.pending ? "writing" : "kept");

/**
 * The draft open: its recipients, subject, text and files, kept on the phone as it is typed, and the review of its send.
 * Each control is offered exactly when its machine takes its event.
 * @model spec/app/inbox/drafts.md
 */
export function Compose({ runtime, list }: ComposeProps) {
  const { state, can, send } = useTimed(runtime, useDrafts);
  const ops = useTimed(runtime, useChanges);
  const adding = useAdding(runtime);
  const shell = useShell(runtime).state;
  const account = state?.letter.account;
  const recent = useMemo(() => list.selected.account === account
    ? correspondents(runtime.runSync(Mail).shown(list))
    : [], [account, list, runtime]);
  if (!state || !ops.state || !adding.state || !state.open) return null;
  const letter = state.letter;
  const draft = letter.id;
  const letters = runtime.runSync(Letters);
  const mail = runtime.runSync(Mail);
  const words = letters.words(draft);
  const typing = words.pending ?? emptyAddressFields;
  const access = accessOf(list, letter.account);
  const from = mail.email(letter.account);
  const contactState = adding.state;
  const contactsOpen = contactState.contactDraft === draft;
  const contactTicket = contactState.people.ticket;
  const closeContacts = { type: "closePeople" } as const;
  const morePeople = { type: "morePeople", draft } as const;
  const mayUseContacts = shell !== undefined && available(shell, "Contacts");
  const write = { type: "write", now: untimed } as const;
  const change = (next: Partial<Words>) => {
    if (!can(write, "Owner")) return;
    letters.set(draft, { ...letters.words(draft), ...next });
    void send(write, "Owner");
  };
  const line = (name: "to" | "cc" | "bcc") => ({
    recipients: words[name].map((address) => ({ address, valid: acceptable(address) })),
    value: typing[name],
    onValueChange: (value: string) => {
      change({ pending: { ...typing, [name]: value } });
      const finding = { type: "findPeople", draft, query: value.trim().slice(0, 200) } as const;
      if (name === "to" && adding.can(finding)) void adding.send(finding);
    },
    onAdd: (address: string) => {
      const added = { type: "addRecipient", now: untimed, draft, valid: acceptable(address) } as const;
      if (address === "") return;
      const pending = { ...typing, [name]: "" };
      if (words[name].includes(address)) {
        change({ pending });
        return;
      }
      if (!can(added, "Owner")) return;
      letters.set(draft, { ...letters.words(draft), [name]: [...words[name], address], pending });
      void send(added, "Owner");
    },
    onRemove: (address: string) => {
      const removed = { type: "removeRecipient", now: untimed, valid: acceptable(address) } as const;
      if (!can(removed, "Owner")) return;
      letters.set(draft, { ...words, [name]: words[name].filter((one) => one !== address) });
      void send(removed, "Owner");
    },
  });
  const query = typing.to.trim().toLowerCase();
  const addressedTo = new Set(words.to.map((email) => email.toLowerCase()));
  const eligible = recent.filter(({ email }) => email.toLowerCase() !== from.toLowerCase() && !addressedTo.has(email.toLowerCase()));
  const suggested = query === "" ? (words.to.length === 0 ? eligible.slice(0, 3) : []) : eligible.filter(({ name, email }) => name.toLowerCase().includes(query) || email.toLowerCase().includes(query));
  const page = contactsOpen && contactState.people.status === "Loaded" ? runtime.runSync(ContactAddresses).current() : undefined;
  const choices = page?.ticket === contactTicket ? page.addresses.flatMap((person, at) => {
    const event = { type: "chooseContact", draft, ticket: contactTicket, address: at + 1 } as const;
    return addressedTo.has(person.email.toLowerCase()) || !adding.can(event) ? [] : [{ ...person, onChoose: () => void adding.send(event) }];
  }) : [];
  const contactsStatus = !contactsOpen ? undefined
    : contactState.contacts === "InSettings" ? "Allow Contacts in Settings"
      : contactState.contacts === "Asked" || contactState.people.status === "Loading" ? "Reading contacts…"
        : contactState.people.status === "Failed" ? "Couldn’t read contacts"
          : choices.length === 0 ? "No matching contacts" : undefined;
  const kept = state.stored && flushed(state);
  const addressed = Object.values(typing).every((value) => value.trim() === "");
  const changeFrom = (account: number) => ({ type: "changeFrom", account, access: accessOf(list, account), typing: !addressed }) as const;
  const accounts = [
    { id: String(letter.account), email: from, grant: access.grant },
    ...list.connected.filter(({ account }) => can(changeFrom(account), "Owner")).map(({ account, grant }) => ({ id: String(account), email: mail.email(account), grant })),
  ];
  const sending = { type: "prepare", kind: "Send", access, letter, kept: kept && addressed, again: false } as const;
  // spec/app/inbox/sending.md, "While the account's grant lacks consent to send, nothing is sent, and Turn on opens Google authorization"
  const turnOn = { type: "turnOnSending", access, account: letter.account } as const;
  const onTurnOn = shell && ops.can(turnOn, "Owner") ? () => {
    const popup = gmailAuthorizationWindow();
    const intent = { kind: "Send", route: shell.route, account: letter.account, draft, session: state.session } as const;
    void runtime.runPromise(Effect.flatMap(MailSignIn, (signIn) => signIn.consent(intent, popup)));
  } : undefined;
  // spec/app/inbox/sending.md, "Story: Save my draft to Gmail, or delete it there, knowingly"
  const saving = { type: "prepare", kind: letter.gmail === 0 ? "SaveDraft" : "ReplaceDraft", access, letter, kept: kept && addressed, again: false } as const;
  const lookUp = { type: "lookUp", access } as const;
  const checkCopy = kept && addressed && can(lookUp, "Owner") ? () => void send(lookUp, "Owner") : undefined;
  const clash = letter.draft.sync === "Conflicted";
  const copy = clash ? letters.copy(letter.gmail) : undefined;
  const latest = choiceOf(copy);
  const gmail = clash ? "clash" : letter.draft.sync === "Saving" ? "saving" : letter.gmail === 0 || letter.unsure ? "none" : letter.draft.sync === "Edited" ? "unsaved" : "saved";
  const deleting = { type: "prepare", kind: "DeleteDraft", access, letter, kept, again: false } as const;
  const confirm = { type: "confirm", revision: letter.revision, access, now: untimed } as const;
  const reviewed = ops.state.kind === "Send" || ops.state.kind === "SaveDraft" || ops.state.kind === "ReplaceDraft" || ops.state.kind === "DeleteDraft";
  const reviewing = ops.state.review.showing && ops.state.draft === draft && reviewed;
  const outcome = outcomeOf(ops.state, letter);
  const checkingSent = state.checking === draft && state.check.status === "Loading";
  const checkSent = { type: "checkSent", draft, access } as const;
  const sendAgain = { ...sending, again: true } as const;
  const sendOutcome: InboxSendOutcomeProps | undefined = outcome === undefined ? undefined : {
    outcome, checking: checkingSent,
    onCheckSent: checkingSent || can(checkSent, "Owner") ? () => { if (!checkingSent) void send(checkSent, "Owner"); } : undefined,
    onSendAgain: outcome === "unknown" && !checkingSent && ops.can(sendAgain, "Owner") ? () => void ops.send(sendAgain, "Owner") : undefined,
  };
  const notice = state.lookup.status === "Loading" ? "checkingGmailCopy"
    : letter.unsure ? "gmailCopyUnknown"
    : state.lookup.status === "Failed" ? "unreachable"
    : notices[state.notice] ?? (letter.textOnly ? "forwardTextOnly" : undefined);
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
      letters.set(draft, { ...words, files: words.files.filter((_, at) => at !== Number(id)) });
      void send(event, "Owner");
    };
  };
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
        suggestions={contactsOpen ? choices : suggested}
        contactsOpen={contactsOpen}
        contactsStatus={contactsStatus}
        onContacts={mayUseContacts ? () => {
          if (contactState.contacts !== "InSettings" && adding.can(closeContacts)) void adding.send(closeContacts);
          else void runtime.runPromise(pickPeople(draft));
        } : undefined}
        onMoreContacts={adding.can(morePeople) ? () => void adding.send(morePeople) : undefined}
        cc={line("cc")}
        bcc={line("bcc")}
        subject={words.subject}
        onSubjectChange={(subject) => change({ subject })}
        text={words.text}
        onTextChange={(text) => change({ text })}
        attachments={words.files.map((file, at) => ({ id: String(at), name: file.name }))}
        onRemoveAttachment={(id) => detach(id)?.()}
        onAttach={adding.can(attach) && canAttach(letter, policy, 1) ? () => void adding.send(attach) : undefined}
        notice={refused ?? notice}
        onNoticeAction={refused === undefined ? checkCopy : undefined}
        onTurnOnSending={onTurnOn}
        outcome={sendOutcome}
        storage={ready(state) ? undefined : state.load.status === "Failed" ? "unavailable" : "checking"}
        onReloadStorage={can({ type: "reload" }, "World") ? () => void send({ type: "reload" }, "World") : undefined}
        keeping={keepingOf(state)}
        gmail={gmail}
        clash={clash}
        onRestoreMine={copy?.seen && can({ type: "restoreMine" }, "Owner") ? () => void runtime.runPromise(restoreMyEdits()) : undefined}
        onUseSaved={latest && can(latest, "Owner") ? () => void runtime.runPromise(chooseLatestSavedDraft()) : undefined}
        sent={letter.sent === 0 ? "none" : letter.sent === letter.revision ? "already" : "earlier"}
        onKeepAgain={can({ type: "keepAgain" }, "World") ? () => void send({ type: "keepAgain" }, "World") : undefined}
        onSend={ops.can(sending, "Owner") ? () => void ops.send(sending, "Owner") : undefined}
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

/**
 * A file another part of Alpha handed to Inbox, shown before it joins the draft open or starts a new message.
 * @model spec/app/inbox/adding.md
 */
export function FileOffer({ runtime }: { runtime: ComposeProps["runtime"] }) {
  const { state, can, send } = useAdding(runtime);
  const drafts = useDrafts(runtime);
  if (!state || !drafts.state) return null;
  const held = runtime.runSync(Incoming).file();
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
  const offers = runtime.runSync(Offers);
  const text = offers.text(state.text);
  const account = runtime.runSync(Mail).email(letter?.account ?? state.account);
  const before = letter === undefined ? "" : runtime.runSync(Letters).words(letter.id).text;
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
      source={offers.source(state.text)}
      account={account}
      target={targets[state.target]}
      tooLong={state.blocked}
      onAdd={state.target === "ToDraft" ? using(true) : using(false)}
      onReplace={state.target === "ToDraft" ? using(false) : undefined}
      onDismiss={() => void send({ type: "dismiss" }, "Owner")}
    />
  );
}
