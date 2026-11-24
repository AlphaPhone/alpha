// spec/app/telephony/messages.md, "Story: Read my conversations while Messages is open"; spec/app/telephony/drafts.md, "Story: Send only what I reviewed, once"
import { normalizePhoneNumber } from "@elizaos/os/bridges/definitions/phone";
import { Alert, Banner, Button, Chip, ConfirmDialog, EmptyState, Input, ListGroup, ListRow, SearchField, Spinner, Textarea } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Phone as Call, Plus, Search, Send } from "lucide-react";
import type { Machine as DraftsMachine, Slot } from "../../gen/app__telephony__drafts.effect.vibe";
import { slotOf } from "../../gen/app__telephony__drafts.ts";
import { useMachine as useDrafts } from "../../gen/app__telephony__drafts.react.ts";
import type { MessageRow, Machine as MessagesMachine, Messages as State } from "../../gen/app__telephony__messages.effect.vibe";
import { openThreadId, threadCallNumber } from "../../gen/app__telephony__messages.ts";
import { useMachine as useMessages } from "../../gen/app__telephony__messages.react.ts";
import { CommsBar, type CommsServices } from "./CommsBar.tsx";
import { matches, placements } from "./words.ts";

export interface MessagesProps {
  /** Provides the resident Messages and drafts machines. */
  runtime: ManagedRuntime.ManagedRuntime<MessagesMachine | DraftsMachine | CommsServices, unknown>;
}

const refusals = { Removed: "", RowMissing: "That message is already gone", RowChanged: "That message changed. Look again before deleting it.", RowInSend: "That message is still sending", RemovalUnknown: "" } as const;
const conditions = { Received: "", PendingOut: "Sending", SentOut: "Sent", FailedOut: "Not sent", DeliveredOut: "Delivered" } as const;
const outcomes = { NotSent: "", Sending: "", Unconfirmed: "Alpha cannot tell whether this message was sent. Send again only checks.", SendFailed: "The message was not sent", SendRefused: "The phone did not send the message" } as const;

/**
 * Messages: the conversations the phone lists, one conversation with its draft, and a new message. Send is the owner's
 * own tap and sends what the draft shows, once.
 * @model spec/app/telephony/messages.md
 */
export function Messages({ runtime }: MessagesProps) {
  const messages = useMessages(runtime);
  const drafts = useDrafts(runtime);
  if (messages.cause || drafts.cause) return <Alert variant="destructive" className="m-4">Alpha could not open Messages</Alert>;
  const { state, can, send } = messages;
  if (!state || !drafts.state) return null;
  const threadId = openThreadId(state.view);
  return (
    <section aria-label="Messages" className="flex flex-col gap-3 p-4">
      {state.page.status === "Loading" && state.threads.length === 0 && state.rows.length === 0 && <Spinner label="Reading messages" />}
      {state.page.status === "Failed" && <Banner variant="destructive" action={<Button variant="outline" size="sm" onClick={() => void send({ type: "refresh", more: false })}>Try again</Button>}>Messages could not be read completely</Banner>}
      {state.sms.grant === "Denied" && (
        <Banner variant="warn" action={can({ type: "allow" }) && <Button size="sm" onClick={() => void send({ type: "allow" })}>Allow</Button>}>
          {can({ type: "allow" }) ? "Messages needs access to your texts" : "Allow SMS access for Alpha in Android's settings"}
        </Banner>
      )}
      {threadId !== "" ? <Conversation state={state} threadId={threadId} runtime={runtime} />
        : state.view.tag === "Composing" ? <NewMessage state={state} runtime={runtime} />
          : <Conversations state={state} runtime={runtime} />}
      <CommsBar runtime={runtime} />
    </section>
  );
}

function Conversations({ state, runtime }: { state: State; runtime: MessagesProps["runtime"] }) {
  const { can, send } = useMessages(runtime);
  const query = state.listQuery.tag === "NoQuery" ? "" : state.listQuery.tag === "OwnerQuery" ? state.listQuery.typed : state.listQuery.query;
  const shown = state.threads.filter((thread) => matches(query, `${thread.title} ${thread.snippet}`));
  return (
    <>
      <div className="flex items-center gap-2">
        {state.searching
          ? <SearchField autoFocus aria-label="Search messages" placeholder="Search or ask" className="flex-1" value={state.listQuery.tag === "OwnerQuery" ? state.listQuery.typed : ""} onValueChange={(typed) => void send({ type: "queryTyped", typed })} />
          : can({ type: "searchOpened" }) && <Button variant="ghost" size="icon" aria-label="Search" onClick={() => void send({ type: "searchOpened" })}><Search /></Button>}
        {can({ type: "composeOpened" }) && <Button variant="ghost" size="icon" aria-label="New message" onClick={() => void send({ type: "composeOpened" })}><Plus /></Button>}
      </div>
      {state.listQuery.tag === "AlphaQuery" && <Chip onClear={() => void send({ type: "queryCleared" })} clearLabel="Clear Alpha's filter">{state.listQuery.label}</Chip>}
      {state.page.status === "Loaded" && state.sms.grant === "Granted" && shown.length === 0 && <EmptyState title={query === "" ? "No messages" : "No matching messages"} />}
      {shown.length > 0 && (
        <ListGroup aria-label="Conversations">
          {shown.map((thread) => (
            <ListRow key={thread.id} aria-label={thread.complete ? thread.title : "A conversation Alpha cannot show"} title={thread.complete ? thread.title : "A conversation Alpha cannot show"} detail={thread.snippet}
              trailing={thread.unread ? <span className="size-2 rounded-full bg-primary" aria-label="Unread" /> : undefined}
              disabled={!can({ type: "threadOpened", threadId: thread.id })} onClick={() => void send({ type: "threadOpened", threadId: thread.id })} />
          ))}
        </ListGroup>
      )}
      {can({ type: "refresh", more: true }) && <Button variant="outline" onClick={() => void send({ type: "refresh", more: true })}>Load more</Button>}
    </>
  );
}

function Conversation({ state, threadId, runtime }: { state: State; threadId: string; runtime: MessagesProps["runtime"] }) {
  const { can, send } = useMessages(runtime);
  const addresses = state.view.tag === "InThread" ? state.view.addresses : [];
  const menu = state.menu.tag === "MenuOpen" ? state.menu : undefined;
  const number = threadCallNumber(state.view);
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{addresses.join(", ")}</h2>
        {number !== "" && can({ type: "callAsked" }) && <Button variant="ghost" size="icon" aria-label={`Call ${number}`} onClick={() => void send({ type: "callAsked" })}><Call /></Button>}
      </div>
      {state.call.outcome !== "Planned" && state.call.outcome !== "Sent" && placements[state.callOutcome] !== "" && <Banner variant="warn">{placements[state.callOutcome]}</Banner>}
      {state.deleteNotice.tag === "DeleteRefused" && <Banner variant="warn">{refusals[state.deleteNotice.reason]}</Banner>}
      {state.deleteNotice.tag === "DeleteUncertain" && <Banner variant="warn">Alpha cannot tell whether the message was deleted</Banner>}
      <ol aria-label="Conversation" className="flex flex-col gap-2">
        {state.rows.map((row: MessageRow) => (
          <li key={row.id} className={row.outgoing ? "flex flex-col items-end gap-1" : "flex flex-col items-start gap-1"}>
            <button type="button" disabled={!can({ type: "menuOpened", rowId: row.id })} onClick={() => void send({ type: "menuOpened", rowId: row.id })}
              className={row.outgoing ? "rounded-lg bg-primary px-3 py-2 text-left text-primary-foreground" : "rounded-lg bg-muted px-3 py-2 text-left"}>
              {row.complete ? row.body || (row.pictures > 0 ? `${row.pictures} picture${row.pictures === 1 ? "" : "s"}` : "") : "A message Alpha cannot show"}
            </button>
            {conditions[row.condition] !== "" && <span className="text-xs text-muted-foreground">{conditions[row.condition]}</span>}
            {menu?.rowId === row.id && (
              <div role="menu" aria-label="Message" className="flex gap-2">
                <Button role="menuitem" variant="outline" size="sm" onClick={() => { void navigator.clipboard?.writeText(row.body); void send({ type: "menuClosed" }); }}>Copy</Button>
                {can({ type: "deleteAsked" }) && <Button role="menuitem" variant="destructive" size="sm" onClick={() => void send({ type: "deleteAsked" })}>Delete</Button>}
              </div>
            )}
          </li>
        ))}
      </ol>
      <ConfirmDialog open={menu?.confirm ?? false} title="Delete this message?" confirmLabel="Delete" destructive loading={state.deletion.outcome === "Sent"}
        onConfirm={() => void send({ type: "deleteStarted" })} onCancel={() => void (can({ type: "menuClosed" }) && send({ type: "menuClosed" }))} />
      <Composer runtime={runtime} thread={threadId} recipients={addresses} />
    </>
  );
}

function NewMessage({ state, runtime }: { state: State; runtime: MessagesProps["runtime"] }) {
  const { can, send } = useMessages(runtime);
  const drafts = useDrafts(runtime);
  const slot: Slot | undefined = drafts.state && slotOf(drafts.state.slots, "new");
  const recipients = slot?.recipients ?? [];
  const picker = state.picker.tag === "PickerOpen" ? state.picker : undefined;
  const to = (numbers: readonly string[]) => ({ type: "recipientsChanged" as const, thread: "new", recipients: [...numbers] });
  return (
    <>
      <Input aria-label="To" placeholder="To" defaultValue={recipients.join(", ")}
        onChange={(event) => {
          const typed = event.target.value;
          const numbers = typed.split(",").map((part) => normalizePhoneNumber(part)).filter((number) => number !== null);
          if (drafts.can(to(numbers), "Owner")) void drafts.send(to(numbers), "Owner");
          const last = typed.split(",").at(-1)?.trim() ?? "";
          if (last !== "" && normalizePhoneNumber(last) === null && can({ type: "pickerQueried", query: last })) void send({ type: "pickerQueried", query: last });
        }} />
      {picker && (
        <ListGroup aria-label="Contacts">
          {picker.needsAccess && <Alert variant="warn">Alpha needs access to your contacts to suggest them</Alert>}
          {picker.choices.map((choice) => (
            <ListRow key={choice.key} title={choice.title} detail={choice.number} disabled={!can({ type: "picked", pickKey: choice.key })}
              onClick={() => {
                void send({ type: "picked", pickKey: choice.key });
                if (drafts.can(to([...recipients, choice.number]), "Owner")) void drafts.send(to([...recipients, choice.number]), "Owner");
              }} />
          ))}
        </ListGroup>
      )}
      <Composer runtime={runtime} thread="new" recipients={recipients} />
    </>
  );
}

/** The draft of `thread`, kept as it is typed, and Send exactly when the rules take it. */
function Composer({ runtime, thread, recipients }: { runtime: MessagesProps["runtime"]; thread: string; recipients: readonly string[] }) {
  const { state, can, send } = useDrafts(runtime);
  if (!state) return null;
  const slot = slotOf(state.slots, thread);
  const typed = (text: string) => ({ type: "ownerTyped" as const, thread, recipients: [...recipients], text });
  const sending = { type: "sendStarted", thread, kind: "SmsSend", sim: slot.sim } as const;
  return (
    <form className="flex flex-col gap-2" onSubmit={(event) => { event.preventDefault(); if (can(sending, "Owner")) void send(sending, "Owner"); }}>
      {outcomes[slot.outcome] !== "" && <Alert variant="warn">{outcomes[slot.outcome]}</Alert>}
      {slot.author === "ByAlpha" && slot.text !== "" && <p className="text-sm text-muted-foreground">Alpha's draft</p>}
      <div className="flex items-end gap-2">
        <Textarea aria-label="Message" placeholder={recipients.length === 1 ? `Text ${recipients[0]}` : "Message"} className="flex-1" value={slot.text}
          disabled={!can(typed(slot.text), "Owner")} onChange={(event) => void send(typed(event.target.value), "Owner")} />
        <Button type="submit" size="icon" aria-label="Send" disabled={!can(sending, "Owner")} loading={slot.outcome === "Sending"}><Send /></Button>
      </div>
    </form>
  );
}
