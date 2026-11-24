// spec/telephony/messages.md, "Story: Read my conversations while Messages is open"; spec/telephony/messages.md, "Story: Open a conversation"; spec/telephony/messages.md, "Story: Start a new message"; spec/telephony/messages.md, "Story: Find a conversation"; spec/telephony/messages.md, "Story: Copy or delete one message"; spec/telephony/drafts.md, "Story: Send only what I reviewed, once"; spec/telephony/comms.md, "Story: Address the person or Alpha from one bar"
import { normalizePhoneNumber } from "@elizaos/os/bridges/definitions/phone";
import { ArrowLeft, Phone as PhoneIcon, Plus, Search, X } from "lucide-react";
import { type Ref, useState } from "react";
import { slotOf, type Drafts } from "../../../gen/telephony__drafts.ts";
import { threadCallNumber, type Messages } from "../../../gen/telephony__messages.ts";
import type { SimChoice } from "../../telephony/drafts.vibe";
import { Avatar, Button, Input, ListRow } from "../components/ui/index.ts";
import { CommsBar } from "./CommsBar.tsx";
import { DraftBubble } from "./DraftBubble.tsx";
import { MessageBubble } from "./MessageBubble.tsx";
import { deleteNoticeText, isAskSentence, queryOf, threadTitle } from "./present.ts";
import { RestoredProposal } from "./RestoredProposal.tsx";
import type { StageViewProps } from "./stage.ts";
import { ThreadList } from "./ThreadList.tsx";

export interface MessagesScreenViewProps extends StageViewProps {
  /** Where the container starts and ends Messages' visit. */
  ref?: Ref<HTMLElement>;
  /** Messages' state: the list, the open conversation or the new message, its menu and its sends. */
  messages: Messages;
  /** The draft slots and requests to Alpha; the view shows the slot of the conversation on screen. */
  drafts: Drafts;
  /** The time the rows are placed against. */
  now: number;
  /** What the last Send, Call or attach said. */
  notice: string;
  /** Alpha's line answering the list sentence. */
  answer: string;
  /** The SIMs to send from, offered after a Send that needs one. */
  sims: readonly SimChoice[];
  /** Back from the conversation or the new message. */
  onBack: () => void;
  /** Call the conversation's one other person. */
  onCallThread: () => void;
  /** Open the search field, and start a new message. */
  onSearchOpened: () => void;
  onComposeOpened: () => void;
  /** The owner typed in the list query. */
  onQuery: (typed: string) => void;
  /** Open a conversation. */
  onOpenThread: (threadId: string) => void;
  /** Allow SMS and Contacts access. */
  onAllow: () => void;
  /** Refresh the list, and load more conversations or earlier messages. */
  onRefresh: () => void;
  onMore: () => void;
  /** Clear Alpha's filter. */
  onClearQuery: () => void;
  /** The owner typed in To: the contact picker reads for it. */
  onPickerQuery: (query: string) => void;
  /** Enter on a number in To adds it as a recipient. */
  onAddRecipient: (number: string) => void;
  /** Pick a contact from the picker. */
  onPick: (key: string) => void;
  /** The new message's recipients after one was removed. */
  onRecipientsChanged: (recipients: string[]) => void;
  /** Toggle a message's menu, and ask, cancel or confirm its delete. */
  onMenu: (rowId: string) => void;
  onDeleteAsked: () => void;
  onDeleteCancelled: () => void;
  onDeleteConfirmed: () => void;
  /** Open a credential-free link in Alpha's Browser. */
  onLink: (href: string) => void;
  /** The owner typed to the person: the conversation's draft. */
  onOwnerTyped: (thread: string, recipients: string[], text: string) => void;
  /** The owner's Send of a conversation's draft. */
  onSend: (thread: string) => void;
  /** Edit: Alpha's draft becomes the owner's text and the chat closes. */
  onAdopt: (thread: string) => void;
  /** The owner rewrote Alpha's draft in its bubble. */
  onAlphaDraftEdited: (thread: string, text: string) => void;
  /** Don't send, and Undo, on Alpha's draft. */
  onDiscard: (thread: string) => void;
  onUndo: (thread: string) => void;
  /** Send the draft from the SIM chosen. */
  onChooseSim: (thread: string, sim: number) => void;
  /** Attach a picture, and remove one. */
  onAttach: (thread: string) => void;
  onRemovePicture: (thread: string, pictureName: string) => void;
  /** Enter on a list sentence: Alpha's filter answers, or the question goes to Alpha. */
  onAsk: (text: string) => void;
}

/**
 * Messages' list, a conversation with its draft, or a new message, and the one bar, as the state gives them.
 * @model spec/telephony/messages.md
 * @design design.md
 */
export function MessagesScreenView({
  ref, messages: m, drafts, now, notice, answer, sims, comms, request, card,
  onBack, onCallThread, onSearchOpened, onComposeOpened, onQuery, onOpenThread, onAllow, onRefresh, onMore, onClearQuery,
  onPickerQuery, onAddRecipient, onPick, onRecipientsChanged, onMenu, onDeleteAsked, onDeleteCancelled, onDeleteConfirmed, onLink,
  onOwnerTyped, onSend, onAdopt, onAlphaDraftEdited, onDiscard, onUndo, onChooseSim, onAttach, onRemovePicture, onAsk,
  onRequest, onSubmitRequest, onAlpha, onEndCall, onCloseChat, onDecline,
}: MessagesScreenViewProps) {
  const [query, setQuery] = useState("");
  const open = m.view.tag === "InThread" ? m.view : null;
  const thread = open ? open.threadId : "new";
  const slot = slotOf(drafts.slots, thread);
  const listed = open ? m.threads.find((t) => t.id === open.threadId) : undefined;
  const title = open ? threadTitle(listed?.title ?? "", open.addresses) : threadTitle("", slot.recipients);
  const chatOpen = comms.height !== "SheetClosed";
  const person = open !== null || m.view.tag === "Composing";
  const recipients = open ? open.addresses.map(normalizePhoneNumber).filter((n): n is NonNullable<typeof n> => n !== null) : slot.recipients;
  const canSend = slot.outcome !== "Sending" && recipients.length > 0 && (slot.text.trim() !== "" || slot.pictures.length > 0);
  const listQuery = queryOf(m.listQuery);
  const sole = threadCallNumber(m.view) !== "";

  return (
    <section ref={ref} aria-label="Messages" className="flex h-full flex-col bg-background text-foreground">
      <header className="flex items-center gap-2 px-4 pt-4 pb-2">
        {(open || m.view.tag === "Composing") && <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack}><ArrowLeft aria-hidden /></Button>}
        {open && <Avatar name={title} />}
        <h1 className="min-w-0 flex-1 truncate font-display text-2xl">{open ? title : m.view.tag === "Composing" ? "New message" : "Messages"}</h1>
        {sole && (
          <Button variant="ghost" size="icon" aria-label={`Call ${title}`} onClick={onCallThread}>
            <PhoneIcon aria-hidden />
          </Button>
        )}
        {m.view.tag === "ThreadList" && !m.searching && (
          <>
            <Button variant="ghost" size="icon" aria-label="Search messages" onClick={onSearchOpened}><Search aria-hidden /></Button>
            <Button variant="ghost" size="icon" aria-label="New message" onClick={onComposeOpened}><Plus aria-hidden /></Button>
          </>
        )}
        {m.searching && (
          <Input autoFocus aria-label="Search messages" value={listQuery.text} onChange={(event) => onQuery(event.target.value)} className="flex-1" />
        )}
      </header>
      {(notice || answer) && <p role="status" className="px-4 text-sm text-muted-foreground">{notice || answer}</p>}
      {deleteNoticeText(m.deleteNotice) && <p role="status" className="px-4 text-sm text-muted-foreground">{deleteNoticeText(m.deleteNotice)}</p>}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {m.view.tag === "ThreadList" && (
          <ThreadList messages={m} now={now} onOpen={onOpenThread} onAllow={onAllow} onRefresh={onRefresh} onMore={onMore} onClearQuery={onClearQuery} />
        )}
        {m.view.tag === "Composing" && (
          <div className="flex flex-col gap-2 px-4">
            <Input
              aria-label="To"
              placeholder="To"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                onPickerQuery(event.target.value);
              }}
              onKeyDown={(event) => {
                const number = normalizePhoneNumber(query);
                if (event.key !== "Enter" || !number) return;
                event.preventDefault();
                onAddRecipient(number);
                setQuery("");
              }}
            />
            {slot.recipients.length > 0 && (
              <ul aria-label="Recipients" className="flex flex-wrap gap-1">
                {slot.recipients.map((number) => (
                  <li key={number}>
                    <Button variant="secondary" size="sm" aria-label={`Remove ${number}`} onClick={() => onRecipientsChanged(slot.recipients.filter((r) => r !== number))}>
                      {number}<X aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {m.picker.tag === "PickerOpen" && (
              <ul aria-label="Contacts" className="divide-y divide-border">
                {m.picker.needsAccess && <li><Button variant="secondary" onClick={onAllow}>Allow Contacts</Button></li>}
                {m.picker.choices.filter((c) => !slot.recipients.includes(c.number)).map((c) => (
                  <li key={c.key}>
                    <ListRow title={c.title} detail={c.number} leading={<Avatar name={c.title} />} aria-label={`${c.title}, ${c.number}`} onClick={() => {
                      setQuery("");
                      onPick(c.key);
                    }} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {open && (
          <div data-alpha-messages-thread className="flex flex-1 flex-col justify-end gap-2 px-4 py-2">
            {m.more && <Button variant="ghost" onClick={onMore}>Load earlier</Button>}
            {[...m.rows].sort((a, b) => a.date - b.date).map((row) => (
              <MessageBubble
                key={row.id}
                row={row}
                menu={m.menu.tag === "MenuOpen" && m.menu.rowId === row.id ? (m.menu.confirm ? "confirming" : "open") : "closed"}
                deleteBlocked={m.uncertain.includes(row.id)}
                deleting={m.deleting}
                onMenu={() => onMenu(row.id)}
                onDeleteAsked={onDeleteAsked}
                onDeleteCancelled={onDeleteCancelled}
                onDeleteConfirmed={onDeleteConfirmed}
                onLink={onLink}
              />
            ))}
            {m.outgoing.filter((o) => o.toThread === open.threadId).map((o) => (
              <MessageBubble key={o.operationId} local={o.progress === "Sending"} row={{ id: o.operationId, outgoing: true, body: o.body, pictures: 0, complete: true, condition: o.progress === "Unsure" ? "PendingOut" : "SentOut", date: o.createdAt || o.startedAt }} />
            ))}
            {chatOpen && slot.text.trim() !== "" && (
              <DraftBubble
                slot={slot}
                title={title}
                canSend={canSend}
                onSend={() => onSend(thread)}
                onEdit={() => {
                  onAdopt(thread);
                  onCloseChat();
                }}
                onText={(text) => onAlphaDraftEdited(thread, text)}
                onDiscard={() => onDiscard(thread)}
                onUndo={() => onUndo(thread)}
              />
            )}
          </div>
        )}
      </div>
      {slot.pictures.length > 0 && (
        <ul aria-label="Pictures" className="flex gap-1 px-4 py-1">
          {slot.pictures.map((p) => (
            <li key={p.pictureName}>
              <Button variant="secondary" size="sm" aria-label={`Remove ${p.pictureName}`} onClick={() => onRemovePicture(thread, p.pictureName)}>{p.pictureName}<X aria-hidden /></Button>
            </li>
          ))}
        </ul>
      )}
      {sims.length > 0 && (
        <div role="group" aria-label="Send from" className="flex flex-wrap items-center gap-2 px-4 py-1">
          <span className="text-sm text-muted-foreground">Send from</span>
          {sims.map((sim) => <Button key={sim.id} variant="secondary" size="sm" onClick={() => onChooseSim(thread, sim.id)}>{sim.label}</Button>)}
        </div>
      )}
      <RestoredProposal card={card} onDismiss={onDecline} />
      <CommsBar
        comms={comms}
        person={person ? title : ""}
        value={chatOpen ? request : person ? slot.text : listQuery.chip ? "" : listQuery.text}
        onText={(text) => chatOpen ? onRequest(text) : person ? onOwnerTyped(thread, recipients, text) : onQuery(text)}
        canSubmit={chatOpen ? request.trim() !== "" : person ? canSend : isAskSentence(listQuery.text)}
        onSubmit={() => {
          if (chatOpen) onSubmitRequest();
          else if (person) onSend(thread);
          else onAsk(listQuery.text);
        }}
        onAlpha={onAlpha}
        onEnd={onEndCall}
        onBack={onCloseChat}
        onAttach={person ? () => onAttach(thread) : undefined}
      />
    </section>
  );
}
