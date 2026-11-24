// spec/app/messages/index.md, "Story: See my conversations"; spec/app/messages/index.md, "Story: Read a conversation"; spec/app/messages/index.md, "Story: Act on a message"; spec/app/messages/index.md, "Story: Start a new message"; spec/app/messages/composer.md, "Story: Keep my draft"; spec/app/messages/composer.md, "Story: Send a message"
import { MMS_ATTACHMENT_TYPES } from "@elizaos/os/bridges/definitions/messages";
import type { MessageRow } from "@elizaos/os/bridges/messages";
import { Alert, AppHeader, Avatar, Banner, Button, Chip, ConfirmDialog, Input, ListGroup, ListRow, SearchField, Spinner, Textarea } from "@repo/ui";
import { Effect, type ManagedRuntime } from "effect";
import { ArrowLeft, ArrowUp, Camera, ChevronDown, CircleAlert, Image, Pencil, Phone as Call, Plus, Search, Sparkles, X } from "lucide-react";
import { useReducer, useState } from "react";
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
import type { Alpha } from "../runtime/area.tsx";
import { AppBack } from "../shell/AppBack.tsx";
import { Drafts, attachAll, prepare, supported } from "./composer.vibe";
import { Conversations, Inbox, type Texts, titleOf } from "./messages.vibe";
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
export function Messages({ runtime, alpha }: MessagesProps & { alpha: Alpha }) {
  const messages = useMessages(runtime);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  if (messages.cause) return <Alert variant="destructive" className="m-4">Alpha could not open Messages</Alert>;
  const { state, can, send } = messages;
  if (!state) return null;
  const held = runtime.runSync(Effect.flatMap(Inbox, (inbox) => inbox.get()));
  const set = (change: Partial<Texts>) => runtime.runSync(Effect.flatMap(Inbox, (inbox) => inbox.set(change)));
  const search = (typed: string) => {
    setQuery(typed);
    set({ sought: typed });
    const event = { type: "search", typed: typed.trim() !== "" } as const;
    if (can(event)) void send(event);
  };
  const allow = smsNeeded(state) && (can({ type: "allow", need: "SmsAccess" }) || can({ type: "goToSettings", need: "SmsAccess" }));
  return (
    <section aria-label="Messages" className="flex flex-1 flex-col gap-2">
      {state.pane === "Threads" && (searching ? (
        <form role="search" aria-label="Search messages" data-host-chrome="" className="flex min-h-14 items-center px-2" onSubmit={(event) => event.preventDefault()}>
          <Button variant="ghost" size="icon" aria-label="Back to messages" onClick={() => { search(""); setSearching(false); }}><ArrowLeft className="size-5" /></Button>
          <SearchField autoFocus className="mr-2 flex-1" aria-label="Search conversations" clearLabel="Clear search" placeholder="Search conversations" value={query} onValueChange={search} />
        </form>
      ) : (
        <AppHeader title="Messages" leading={<AppBack alpha={alpha} />} className="gap-1.5 px-3 [&_h1]:font-sans [&_h1]:text-xl [&_h1]:font-semibold">
          <Button variant="ghost" size="icon" aria-label="Search messages" onClick={() => setSearching(true)}><Search className="size-5" /></Button>
          {can({ type: "newMessage" }) && <Button variant="ghost" size="icon" aria-label="New message" onClick={() => void send({ type: "newMessage" })}><Pencil className="size-5" /></Button>}
        </AppHeader>
      ))}
      {allow && (
        <div className="flex flex-1 items-center justify-center px-4">
          {can({ type: "allow", need: "SmsAccess" }) ? <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90" onClick={() => void send({ type: "allow", need: "SmsAccess" })}>Allow SMS read access</Button> : <Button size="lg" variant="secondary" onClick={() => void send({ type: "goToSettings", need: "SmsAccess" })}>Open Settings</Button>}
        </div>
      )}
      {state.pane === "Threads" && (
        <>
          {state.sought && !searching && <Chip className="mx-4 self-start" onClear={() => search("")} clearLabel="Clear the search">{query}</Chip>}
          {searching && <div className="flex gap-2 px-4" role="group" aria-label="Show">
            <Button size="sm" variant={state.chip === "AllThreads" ? "primary" : "outline"} disabled={!can({ type: "pickChip", chip: "AllThreads" }) && state.chip !== "AllThreads"} onClick={() => void send({ type: "pickChip", chip: "AllThreads" })}>All</Button>
            <Button size="sm" variant={state.chip === "UnreadThreads" ? "primary" : "outline"} disabled={!can({ type: "pickChip", chip: "UnreadThreads" }) && state.chip !== "UnreadThreads"} onClick={() => void send({ type: "pickChip", chip: "UnreadThreads" })}>Unread</Button>
          </div>}
          {state.list.status === "Loading" && state.threads === 0 && <Spinner label="Reading conversations" />}
          {threadsFailed(state) && <Banner variant="destructive" action={can({ type: "retryThreads" }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "retryThreads" })}>Retry</Button>}>Conversations could not be read</Banner>}
          {noThreads(state) && !allow && <p role="status" className="mx-5 my-3 text-muted-foreground">No conversations</p>}
          {noMatches(state) && <p role="status" className="mx-5 my-3 text-muted-foreground">No matches</p>}
          {state.threads > 0 && (
            <ListGroup aria-label="Conversations" surface="plain">
              {held.threads.map((row) => {
                const complete = !("incomplete" in row);
                const title = complete ? titleOf(row.addresses, held.names) : "Conversation";
                const unread = complete && row.unread;
                return <ListRow key={row.id} className="min-h-17 items-start px-5 py-2.5" aria-label={title} leading={<Avatar name={title} className="size-12 text-base font-bold" />} title={
                  <span className="flex items-center gap-1.5">
                    {unread && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                    <span className={`flex-1 truncate ${unread ? "font-bold" : "font-semibold"}`}>{title}</span>
                    <span className="shrink-0 text-sm font-normal text-muted-foreground">{when(row.date)}</span>
                  </span>
                } detail={complete ? row.snippet : "Open in your messaging app"}
                  onClick={() => {
                    const thread = runtime.runSync(Effect.flatMap(Conversations, (numbering) => numbering.of({ id: row.id, addresses: complete ? row.addresses : [] })));
                    if (can({ type: "openThread", thread })) void send({ type: "openThread", thread });
                  }} />;
              })}
            </ListGroup>
          )}
          {can({ type: "olderThreads" }) && <Button variant="secondary" size="icon" aria-label="Older conversations" className="self-center" onClick={() => void send({ type: "olderThreads" })}><ChevronDown /></Button>}
        </>
      )}
      {state.pane === "Conversation" && <Conversation runtime={runtime} />}
      {state.pane === "Picker" && <Picker runtime={runtime} />}
      <div className="px-4"><CommsBar runtime={runtime} /></div>
    </section>
  );
}

function Bubble({ row, onChoose, chosen }: { row: MessageRow; onChoose: () => void; chosen: boolean }) {
  if ("incomplete" in row) return <ListRow title="A message Alpha cannot show" detail={when(row.date)} selected={chosen} onClick={onChoose} />;
  const outgoing = row.direction === "outgoing";
  const status = row.status === "failed" ? "Not sent" : row.status === "pending" ? "Sending" : outgoing && (row.status === "delivered" || row.deliveryReport === "complete") ? "Delivered" : outgoing ? "Sent" : "";
  return (
    <button type="button" onClick={onChoose} aria-pressed={chosen}
      className={`flex max-w-[min(17.5rem,100%)] flex-col gap-0.5 rounded-tile text-left ${outgoing ? "self-end items-end" : "self-start items-start"}`}>
      {row.attachments > 0 && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Image aria-hidden className="size-4" />{row.attachments === 1 ? "1 picture" : `${row.attachments} pictures`}</p>}
      {row.body !== "" && <p className={`max-w-full rounded-tile px-4 py-2.75 break-words whitespace-pre-wrap ${outgoing ? "bg-alpha text-alpha-foreground" : "bg-secondary"}`}>{row.body}</p>}
      <p className="px-1.5 text-xs text-muted-foreground">{[when(row.date), status].filter(Boolean).join(" · ")}</p>
      {row.status === "failed" && <CircleAlert role="img" aria-label="Message failed" className="size-4 text-destructive" />}
    </button>
  );
}

/** One conversation: its messages, a chosen message's actions, and the composer. */
function Conversation({ runtime }: MessagesProps) {
  const { state, can, send } = useMessages(runtime);
  const phone = usePhone(runtime).state;
  const [, redraw] = useReducer((revision: number) => revision + 1, 0);
  if (!state || !phone) return null;
  const held = runtime.runSync(Effect.flatMap(Inbox, (inbox) => inbox.get()));
  const conversation = runtime.runSync(Effect.flatMap(Conversations, (numbering) => numbering.get(state.thread)));
  const title = conversation._tag === "Some" ? titleOf(conversation.value.addresses, held.names) : "Conversation";
  const choose = (id: string) => {
    runtime.runSync(Effect.flatMap(Inbox, (inbox) => inbox.set({ chosen: id })));
    redraw();
  };
  const confirm = { type: "confirmDelete", clear: clear(phone) } as const;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      <div data-host-chrome="" className="flex min-h-12 items-center gap-1.5 px-2 pb-2">
        {can({ type: "back" }) && <Button variant="ghost" size="icon" aria-label="Back" onClick={() => void send({ type: "back" })}><ArrowLeft /></Button>}
        <Avatar aria-hidden name={title} className="size-9 font-bold" />
        <h1 className="flex-1 truncate text-lg font-bold">{title}</h1>
        {can({ type: "call" }) && <Button variant="ghost" size="icon" aria-label={`Call ${title}`} onClick={() => void send({ type: "call" })}><Call /></Button>}
      </div>
      {state.page.status === "Loading" && state.shown.rows === 0 && <Spinner label="Reading the conversation" />}
      {state.page.status === "Failed" && <Banner variant="destructive">The conversation could not be read</Banner>}
      {can({ type: "earlierMessages" }) && <Button variant="outline" onClick={() => void send({ type: "earlierMessages" })}>Earlier messages</Button>}
      <div role="log" aria-label="Messages" className="flex min-h-0 flex-1 touch-pan-y flex-col gap-1.5 overflow-y-auto px-4 pb-3.5">
        <div aria-hidden className="mt-auto" />
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
  const text = runtime.runSync(Effect.flatMap(Drafts, (drafts) => drafts.text(state.thread)));
  const conversation = runtime.runSync(Effect.flatMap(Conversations, (numbering) => numbering.get(state.thread)));
  const numbers = conversation._tag === "Some" ? conversation.value.addresses : [];
  const name = titleOf(numbers, runtime.runSync(Effect.flatMap(Inbox, (inbox) => inbox.get())).names);
  const addressed = name === numbers.join(", ") ? name : `${name} · ${numbers.join(", ")}`;
  const pictures = runtime.runSync(Effect.flatMap(Drafts, (drafts) => drafts.pictures()));
  const write = (next: string) => {
    const event = { type: "typeText", empty: next === "" } as const;
    if (!can(event)) return;
    runtime.runSync(Effect.flatMap(Drafts, (drafts) => drafts.write(state.thread, next)));
    void send(event);
  };
  const sendNow = { type: "send", supported: runtime.runSync(supported(state.recipients, pictures.length)), clear: clear(phone) } as const;
  const outgoing = state.outgoing;
  const here = outgoing.thread === state.thread;
  return (
    <form className="flex flex-col gap-2 px-4" onSubmit={(event) => {
      event.preventDefault();
      if (!can(sendNow)) return;
      runtime.runSync(prepare(state.thread, state.sims > 1 ? state.sim : null));
      void send(sendNow);
    }}>
      {state.slot.author === "AlphaWrote" && (
        <div className="flex items-center gap-2" role="group" aria-label={`Message draft to ${addressed}`}>
          <p className="flex-1 truncate text-xs text-muted-foreground">{`Alpha's draft · To ${addressed}`}</p>
          {can({ type: "undo" }) && <Button type="button" size="sm" variant="outline" onClick={() => void send({ type: "undo" })}>Don't send</Button>}
        </div>
      )}
      {state.slot.draft.sync === "Conflicted" && (
        <Banner variant="warn" action={<>
          {can({ type: "keepMine" }) && <Button size="sm" onClick={() => void send({ type: "keepMine" })}>Keep mine</Button>}
          {can({ type: "takeSaved" }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "takeSaved" })}>Use the saved draft</Button>}
        </>}>Another draft was saved for this conversation</Banner>
      )}
      {here && uncertain(outgoing) && <Banner variant="warn">Alpha cannot tell whether your message went. Send again checks before sending.</Banner>}
      {here && outgoing.denied && <Banner variant="destructive">The phone did not send the message</Banner>}
      {here && outgoing.op.outcome === "Refused" && !outgoing.denied && outgoing.failed > 0 && <Banner variant="destructive">The message did not reach everyone</Banner>}
      {here && sentAll(outgoing) && <p role="status" className="text-xs text-muted-foreground">{`${delivered(outgoing) ? "Delivered" : "Sent"} to ${name}`}</p>}
      {pictures.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pictures.map((picture, at) => (
            // eslint-disable-next-line @eslint-react/no-array-index-key -- Attachments can share a name, and these chips own no state.
            <Chip key={`${picture.name}-${at}`} onClear={can({ type: "detach" }) ? () => {
              runtime.runSync(Effect.flatMap(Drafts, (drafts) => drafts.setPictures(pictures.filter((_, other) => other !== at))));
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
      <div className="flex min-h-15.5 items-center gap-1 rounded-full bg-secondary px-2 py-1.5 shadow-lg">
        {([["Attach a picture", Plus, false], ["Take a picture", Camera, true]] as const).map(([label, Icon, camera]) => (
          <label key={label} className={`inline-flex size-10 items-center justify-center rounded-md ${can({ type: "attach", fits: true }) ? "cursor-pointer" : "pointer-events-none opacity-50"}`} aria-label={label}>
            <Icon />
            <Input type="file" multiple={!camera} capture={camera ? "environment" : undefined} accept={MMS_ATTACHMENT_TYPES.join(",")} className="sr-only" onChange={(event) => {
              const files = [...(event.target.files ?? [])];
              event.target.value = "";
              void runtime.runPromise(attachAll(files));
            }} />
          </label>
        ))}
        <Textarea className="min-h-11 min-w-0 flex-1 rounded-full border-0 bg-transparent px-1 py-2.75" aria-label="Message" placeholder="Text message" value={state.slot.author === "Nobody" ? "" : text} onChange={(event) => write(event.target.value)} />
        {can({ type: "suggest" }) && <Button type="button" variant="ghost" size="icon" aria-label="Let Alpha suggest a reply" onClick={() => void send({ type: "suggest" })}><Sparkles /></Button>}
        {can({ type: "handOff", supported: sendNow.supported }) && <Button type="button" variant="outline" onClick={() => void send({ type: "handOff", supported: sendNow.supported })}>Open in messaging app</Button>}
        <Button type="submit" size="icon" aria-label="Send" className="bg-alpha text-alpha-foreground hover:bg-alpha/90" disabled={!can(sendNow)}><ArrowUp /></Button>
      </div>
    </form>
  );
}

/** The picker: a contact's number, or a number typed, opens that conversation. */
function Picker({ runtime }: MessagesProps) {
  const { state, can, send } = useMessages(runtime);
  const [typed, setTyped] = useState("");
  if (!state) return null;
  const held = runtime.runSync(Effect.flatMap(Inbox, (inbox) => inbox.get()));
  const find = (text: string) => {
    setTyped(text);
    runtime.runSync(Effect.flatMap(Inbox, (inbox) => inbox.set({ typed: text })));
    if (can({ type: "findChoices" })) void send({ type: "findChoices" });
  };
  const open = (number: string, typedIn: boolean) => {
    const thread = runtime.runSync(Effect.flatMap(Conversations, (numbering) => numbering.of({ id: "", addresses: [number] })));
    const event = { type: "choose", thread, typed: typedIn } as const;
    if (can(event)) void send(event);
  };
  const number = typed.replace(/[^\d+]/g, "");
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-4">
      <AppHeader title="New message" leading={can({ type: "back" }) && <Button variant="ghost" size="icon" aria-label="Back" onClick={() => void send({ type: "back" })}><ArrowLeft /></Button>} className="-mx-4" />
      <div className="flex items-center gap-2">
        <SearchField className="flex-1" aria-label="To" placeholder="Name or number" value={typed} onValueChange={find} />
      </div>
      {number.length >= 3 && <Button variant="outline" onClick={() => open(number, true)}>{`Text ${number}`}</Button>}
      {can({ type: "allow", need: "ContactsAccess" }) && <Banner variant="warn" action={<Button size="sm" onClick={() => void send({ type: "allow", need: "ContactsAccess" })}>Allow</Button>}>Allow Alpha to read your contacts to pick a recipient</Banner>}
      {can({ type: "goToSettings", need: "ContactsAccess" }) && <Banner variant="warn" action={<Button size="sm" variant="outline" onClick={() => void send({ type: "goToSettings", need: "ContactsAccess" })}>Open Settings</Button>}>Allow contacts for Alpha in Android's settings</Banner>}
      {state.picker.status === "Loading" && <Spinner label="Reading contacts" />}
      {state.choices > 0 && (
        <ListGroup aria-label="Contacts" surface="plain">
          {held.choices.flatMap((contact) => contact.phones.map((phone) => (
            <ListRow key={`${contact.id}:${phone}`} aria-label={contact.name} leading={<Avatar name={contact.name} />} title={contact.name} detail={phone} onClick={() => open(phone, false)} />
          )))}
        </ListGroup>
      )}
      {can({ type: "loadMoreChoices" }) && <Button variant="outline" onClick={() => void send({ type: "loadMoreChoices" })}>More contacts</Button>}
    </div>
  );
}
