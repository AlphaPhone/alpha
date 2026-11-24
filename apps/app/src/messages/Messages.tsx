// spec/app/messages/index.md, "Story: See my conversations"; spec/app/messages/index.md, "Story: Read a conversation"; spec/app/messages/index.md, "Story: Act on a message"; spec/app/messages/index.md, "Story: Start a new message"; spec/app/messages/composer.md, "Story: Keep my draft"; spec/app/messages/composer.md, "Story: Send a message"
import { MMS_ATTACHMENT_TYPES, type MessageRow, type ThreadRow } from "@elizaos/os/bridges/messages";
import { Alert, Banner, Button, Chip, ConfirmDialog, EmptyState, ListGroup, ListRow, SearchField, Spinner, Textarea } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { ArrowLeft, ImagePlus, Phone as Call, Send, X } from "lucide-react";
import { useState } from "react";
import type { Machine as PhoneMachine } from "../../gen/app__phone.effect.vibe";
import { clear } from "../../gen/app__phone.ts";
import { useMachine as usePhone } from "../../gen/app__phone.react.ts";
import type { Machine as MessagesMachine } from "../../gen/app__messages.effect.vibe";
import { content, noMatches, noThreads, smsNeeded, threadsFailed } from "../../gen/app__messages.ts";
import { useMachine as useMessages } from "../../gen/app__messages.react.ts";
import type { Machine as ComposerMachine } from "../../gen/app__messages__composer.effect.vibe";
import { delivered, sentAll, uncertain } from "../../gen/app__messages__sending.ts";
import { useMachine as useComposer } from "../../gen/app__messages__composer.react.ts";
import { when } from "../phone/words.ts";
import { Drafts, attachAll, prepare, supported } from "./composer.vibe";
import { Conversations, Inbox, titleOf } from "./messages.vibe";
import { CommsBar, type CommsServices } from "../phone/CommsBar.tsx";

export interface MessagesProps {
  /** Provides Messages' and the composer's machines, both resident, Phone's, for whether a call may be an emergency call, and what they count. */
  runtime: ManagedRuntime.ManagedRuntime<MessagesMachine | ComposerMachine | PhoneMachine | Inbox | Conversations | Drafts | CommsServices, unknown>;
}


/**
 * Messages: the conversation list, one conversation with its composer, and the picker that starts a new message.
 * Only the owner's Send sends; Alpha's draft is marked as Alpha's and never sends itself.
 * @model spec/app/messages/index.md
 */
export function Messages({ runtime }: MessagesProps) {
  const messages = useMessages(runtime);
  const [query, setQuery] = useState("");
  if (messages.cause) return <Alert variant="destructive" className="m-4">Alpha could not open Messages</Alert>;
  const { state, can, send } = messages;
  if (!state) return null;
  const held = runtime.runSync(Inbox.use((inbox) => inbox.get()));
  const set = (change: Parameters<Inbox["set"]>[0]) => runtime.runSync(Inbox.use((inbox) => inbox.set(change)));
  const search = (typed: string) => {
    setQuery(typed);
    set({ sought: typed });
    const event = { type: "search", typed: typed.trim() !== "" } as const;
    if (can(event)) void send(event);
  };
  const allow = smsNeeded(state) && (can({ type: "allow", need: "SmsAccess" }) || can({ type: "goToSettings", need: "SmsAccess" }));
  return (
    <section aria-label="Messages" className="flex flex-col gap-3 p-4">
      {allow && (
        <Banner variant="warn" action={can({ type: "allow", need: "SmsAccess" }) ? <Button size="sm" onClick={() => void send({ type: "allow", need: "SmsAccess" })}>Allow</Button> : <Button size="sm" variant="outline" onClick={() => void send({ type: "goToSettings", need: "SmsAccess" })}>Open Settings</Button>}>
          Messages needs access to your texts
        </Banner>
      )}
      {state.pane === "Threads" && (
        <>
          <div className="flex items-center gap-2">
            <SearchField className="flex-1" aria-label="Search or ask" placeholder="Search or ask" value={query} onValueChange={search} />
            {can({ type: "newMessage" }) && <Button onClick={() => void send({ type: "newMessage" })}>New message</Button>}
          </div>
          {state.sought && <Chip onClear={() => search("")} clearLabel="Clear the search">{query}</Chip>}
          <div className="flex gap-2" role="group" aria-label="Show">
            <Button size="sm" variant={state.chip === "AllThreads" ? "primary" : "outline"} disabled={!can({ type: "pickChip", chip: "AllThreads" }) && state.chip !== "AllThreads"} onClick={() => void send({ type: "pickChip", chip: "AllThreads" })}>All</Button>
            <Button size="sm" variant={state.chip === "UnreadThreads" ? "primary" : "outline"} disabled={!can({ type: "pickChip", chip: "UnreadThreads" }) && state.chip !== "UnreadThreads"} onClick={() => void send({ type: "pickChip", chip: "UnreadThreads" })}>Unread</Button>
          </div>
          {state.list.status === "Loading" && state.threads === 0 && <Spinner label="Reading conversations" />}
          {threadsFailed(state) && <Banner variant="destructive" action={can({ type: "retryThreads" }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "retryThreads" })}>Retry</Button>}>Conversations could not be read</Banner>}
          {noThreads(state) && <EmptyState title="No conversations" />}
          {noMatches(state) && <EmptyState title="No matching conversations" />}
          {state.threads > 0 && (
            <ListGroup aria-label="Conversations">
              {held.threads.map((row) => (
                <ListRow key={row.id} aria-label={"incomplete" in row ? "Conversation" : titleOf(row.addresses, held.names)} title={"incomplete" in row ? "Conversation" : titleOf(row.addresses, held.names)} detail={"incomplete" in row ? "Open in your messaging app" : row.snippet} trailing={!("incomplete" in row) && row.unread ? <span className="size-2 rounded-full bg-primary" aria-label="Unread" /> : when(row.date)}
                  onClick={() => {
                    const thread = runtime.runSync(Conversations.use((numbering) => numbering.of({ id: row.id, addresses: "incomplete" in row ? [] : row.addresses })));
                    if (can({ type: "openThread", thread })) void send({ type: "openThread", thread });
                  }} />
              ))}
            </ListGroup>
          )}
          {can({ type: "olderThreads" }) && <Button variant="outline" onClick={() => void send({ type: "olderThreads" })}>Older conversations</Button>}
        </>
      )}
      {state.pane === "Conversation" && <Conversation runtime={runtime} />}
      {state.pane === "Picker" && <Picker runtime={runtime} />}
      <CommsBar runtime={runtime} />
    </section>
  );
}

function Bubble({ row, onChoose, chosen }: { row: MessageRow; onChoose: () => void; chosen: boolean }) {
  if ("incomplete" in row) return <ListRow title="A message Alpha cannot show" detail={when(row.date)} selected={chosen} onClick={onChoose} />;
  const outgoing = row.direction === "outgoing";
  const status = row.status === "failed" ? "Not sent" : row.status === "pending" ? "Sending" : outgoing && (row.status === "delivered" || row.deliveryReport === "complete") ? "Delivered" : outgoing ? "Sent" : "";
  return (
    <button type="button" onClick={onChoose} aria-pressed={chosen}
      className={`max-w-[80%] rounded-2xl px-3 py-2 text-left ${outgoing ? "self-end bg-primary text-primary-foreground" : "self-start bg-muted"} ${row.status === "failed" ? "ring-2 ring-destructive" : ""}`}>
      <p className="whitespace-pre-wrap break-words">{row.body}</p>
      {row.attachments > 0 && <p className="text-xs opacity-80">{row.attachments === 1 ? "1 picture" : `${row.attachments} pictures`}</p>}
      <p className="text-xs opacity-70">{[when(row.date), status].filter(Boolean).join(" · ")}</p>
    </button>
  );
}

/** One conversation: its messages, a chosen message's actions, and the composer. */
function Conversation({ runtime }: MessagesProps) {
  const { state, can, send } = useMessages(runtime);
  const phone = usePhone(runtime).state;
  if (!state || !phone) return null;
  const held = runtime.runSync(Inbox.use((inbox) => inbox.get()));
  const conversation = runtime.runSync(Conversations.use((numbering) => numbering.get(state.thread)));
  const title = conversation._tag === "Some" ? titleOf(conversation.value.addresses, held.names) : "Conversation";
  const choose = (id: string) => runtime.runSync(Inbox.use((inbox) => inbox.set({ chosen: id })));
  const confirm = { type: "confirmDelete", clear: clear(phone) } as const;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {can({ type: "back" }) && <Button variant="ghost" size="icon" aria-label="Back" onClick={() => void send({ type: "back" })}><ArrowLeft /></Button>}
        <h2 className="flex-1 truncate font-semibold">{title}</h2>
        {can({ type: "call" }) && <Button variant="ghost" size="icon" aria-label={`Call ${title}`} onClick={() => void send({ type: "call" })}><Call /></Button>}
      </div>
      {state.page.status === "Loading" && state.shown.rows === 0 && <Spinner label="Reading the conversation" />}
      {state.page.status === "Failed" && <Banner variant="destructive">The conversation could not be read</Banner>}
      {can({ type: "earlierMessages" }) && <Button variant="outline" onClick={() => void send({ type: "earlierMessages" })}>Earlier messages</Button>}
      <div role="log" aria-label="Messages" className="flex flex-col gap-2">
        {state.shown.rows > 0 && [...held.messages].reverse().map((row) => <Bubble key={row.id} row={row} chosen={held.chosen === row.id} onChoose={() => choose(row.id)} />)}
      </div>
      {held.chosen !== "" && content(state) && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Message">
          {can({ type: "copy" }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "copy" })}>Copy</Button>}
          {can({ type: "openElsewhere" }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "openElsewhere" })}>Open in messaging app</Button>}
          {can({ type: "askDelete" }) && <Button size="sm" variant="destructive" onClick={() => void send({ type: "askDelete" })}>Delete</Button>}
        </div>
      )}
      {state.removal.outcome === "Unknown" && <Banner variant="warn">Alpha cannot tell whether the message was deleted</Banner>}
      {state.removal.outcome === "Refused" && <Banner variant="destructive">The message was not deleted</Banner>}
      <ConfirmDialog open={state.confirming} title="Delete message?" confirmLabel="Delete" destructive
        onConfirm={() => void (can(confirm) && send(confirm))} onCancel={() => void (can({ type: "keep" }) && send({ type: "keep" }))} />
      <Compose runtime={runtime} />
    </div>
  );
}

/** The open conversation's draft, Alpha's suggestion, the SIM, pictures and Send. */
function Compose({ runtime }: MessagesProps) {
  const composer = useComposer(runtime);
  const phone = usePhone(runtime).state;
  const { state, can, send } = composer;
  if (!state || !phone || state.thread === 0) return null;
  const text = runtime.runSync(Drafts.use((drafts) => drafts.text(state.thread)));
  const pictures = runtime.runSync(Drafts.use((drafts) => drafts.pictures()));
  const write = (next: string) => {
    const event = { type: "typeText", empty: next === "" } as const;
    if (!can(event)) return;
    runtime.runSync(Drafts.use((drafts) => drafts.write(state.thread, next)));
    void send(event);
  };
  const sendNow = { type: "send", supported: runtime.runSync(supported(state.recipients, pictures.length)), clear: clear(phone) } as const;
  const outgoing = state.outgoing;
  const here = outgoing.thread === state.thread;
  return (
    <form className="flex flex-col gap-2" onSubmit={(event) => {
      event.preventDefault();
      if (!can(sendNow)) return;
      runtime.runSync(prepare(state.thread, state.sims > 1 ? state.sim : null));
      void send(sendNow);
    }}>
      {state.slot.author === "AlphaWrote" && <p className="text-xs text-muted-foreground">Alpha's draft · not sent</p>}
      {state.slot.draft.sync === "Conflicted" && (
        <Banner variant="warn" action={<>
          {can({ type: "keepMine" }) && <Button size="sm" onClick={() => void send({ type: "keepMine" })}>Keep mine</Button>}
          {can({ type: "takeSaved" }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "takeSaved" })}>Use the saved draft</Button>}
        </>}>Another draft was saved for this conversation</Banner>
      )}
      {here && uncertain(outgoing) && <Banner variant="warn">Alpha cannot tell whether your message went. Send again checks before sending.</Banner>}
      {here && outgoing.denied && <Banner variant="destructive">The phone did not send the message</Banner>}
      {here && outgoing.op.outcome === "Refused" && !outgoing.denied && outgoing.failed > 0 && <Banner variant="destructive">The message did not reach everyone</Banner>}
      {here && sentAll(outgoing) && <p className="text-xs text-muted-foreground">{delivered(outgoing) ? "Delivered" : "Sent"}</p>}
      {pictures.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pictures.map((picture, at) => (
            <Chip key={`${picture.name}-${at}`} onClear={can({ type: "detach" }) ? () => {
              runtime.runSync(Drafts.use((drafts) => drafts.setPictures(pictures.filter((_, other) => other !== at))));
              void send({ type: "detach" });
            } : undefined} clearLabel={`Remove ${picture.name}`}>{picture.name}</Chip>
          ))}
        </div>
      )}
      {state.sims > 1 && (
        <div className="flex gap-2" role="group" aria-label="SIM">
          {Array.from({ length: state.sims }, (_, at) => at + 1).map((sim) => (
            <Button key={sim} size="sm" variant={state.sim === sim ? "primary" : "outline"} disabled={!can({ type: "pickSim", sim })} onClick={() => void send({ type: "pickSim", sim })}>{`SIM ${sim}`}</Button>
          ))}
        </div>
      )}
      {can({ type: "allow", need: "SendAccess" }) && <Banner variant="warn" action={<Button size="sm" onClick={() => void send({ type: "allow", need: "SendAccess" })}>Allow</Button>}>Sending needs access to send texts</Banner>}
      {can({ type: "goToSettings", need: "SendAccess" }) && <Banner variant="warn" action={<Button size="sm" variant="outline" onClick={() => void send({ type: "goToSettings", need: "SendAccess" })}>Open Settings</Button>}>Allow sending texts for Alpha in Android's settings</Banner>}
      <div className="flex items-end gap-2">
        <label className={`inline-flex size-10 items-center justify-center rounded-md ${can({ type: "attach", fits: true }) ? "cursor-pointer" : "pointer-events-none opacity-50"}`} aria-label="Attach a picture">
          <ImagePlus />
          <input type="file" multiple accept={MMS_ATTACHMENT_TYPES.join(",")} className="sr-only" onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            void runtime.runPromise(attachAll(files));
          }} />
        </label>
        <Textarea className="flex-1" aria-label="Message" placeholder="Text message" value={text} onChange={(event) => write(event.target.value)} />
        {can({ type: "undo" }) && <Button type="button" variant="ghost" size="icon" aria-label="Undo Alpha's draft" onClick={() => void send({ type: "undo" })}><X /></Button>}
        {can({ type: "handOff", supported: sendNow.supported }) && <Button type="button" variant="outline" onClick={() => void send({ type: "handOff", supported: sendNow.supported })}>Open in messaging app</Button>}
        <Button type="submit" size="icon" aria-label="Send" disabled={!can(sendNow)}><Send /></Button>
      </div>
    </form>
  );
}

/** The picker: a contact's number, or a number typed, opens that conversation. */
function Picker({ runtime }: MessagesProps) {
  const { state, can, send } = useMessages(runtime);
  const [typed, setTyped] = useState("");
  if (!state) return null;
  const held = runtime.runSync(Inbox.use((inbox) => inbox.get()));
  const find = (text: string) => {
    setTyped(text);
    runtime.runSync(Inbox.use((inbox) => inbox.set({ typed: text })));
    if (can({ type: "findChoices" })) void send({ type: "findChoices" });
  };
  const open = (number: string, typedIn: boolean) => {
    const thread = runtime.runSync(Conversations.use((numbering) => numbering.of({ id: "", addresses: [number] })));
    const event = { type: "choose", thread, typed: typedIn } as const;
    if (can(event)) void send(event);
  };
  const number = typed.replace(/[^\d+]/g, "");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {can({ type: "back" }) && <Button variant="ghost" size="icon" aria-label="Back" onClick={() => void send({ type: "back" })}><ArrowLeft /></Button>}
        <SearchField className="flex-1" aria-label="To" placeholder="Name or number" value={typed} onValueChange={find} />
      </div>
      {number.length >= 3 && <Button variant="outline" onClick={() => open(number, true)}>{`Text ${number}`}</Button>}
      {can({ type: "allow", need: "ContactsAccess" }) && <Banner variant="warn" action={<Button size="sm" onClick={() => void send({ type: "allow", need: "ContactsAccess" })}>Allow</Button>}>Allow Alpha to read your contacts to pick a recipient</Banner>}
      {can({ type: "goToSettings", need: "ContactsAccess" }) && <Banner variant="warn" action={<Button size="sm" variant="outline" onClick={() => void send({ type: "goToSettings", need: "ContactsAccess" })}>Open Settings</Button>}>Allow contacts for Alpha in Android's settings</Banner>}
      {state.picker.status === "Loading" && <Spinner label="Reading contacts" />}
      {state.choices > 0 && (
        <ListGroup aria-label="Contacts">
          {held.choices.flatMap((contact) => contact.phones.map((phone) => (
            <ListRow key={`${contact.id}:${phone}`} aria-label={contact.name} title={contact.name} detail={phone} onClick={() => open(phone, false)} />
          )))}
        </ListGroup>
      )}
      {can({ type: "loadMoreChoices" }) && <Button variant="outline" onClick={() => void send({ type: "loadMoreChoices" })}>More contacts</Button>}
    </div>
  );
}
