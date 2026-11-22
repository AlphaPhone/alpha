// spec/telephony/messages.md, "Story: Read my conversations while Messages is open"; spec/telephony/messages.md, "Story: Open a conversation"; spec/telephony/messages.md, "Story: Start a new message"; spec/telephony/messages.md, "Story: Find a conversation"; spec/telephony/messages.md, "Story: Copy or delete one message"; spec/telephony/drafts.md, "Story: Send only what I reviewed, once"; spec/telephony/comms.md, "Story: Address the person or Alpha from one bar"
import { normalizePhoneNumber } from "@elizaos/os/bridges/definitions/messages";
import { ArrowLeft, Phone as PhoneIcon, Plus, Search, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { slotOf } from "../../../gen/telephony__drafts.ts";
import { useMachine as useMessagesMachine } from "../../../gen/telephony__messages.react.ts";
import { initial as messagesInitial, type Messages } from "../../../gen/telephony__messages.ts";
import { DraftSends, type SendProblem } from "../../telephony/drafts.vibe";
import { MessagesView } from "../../telephony/messages.vibe";
import { placeOwnerCall } from "../../telephony/phone.vibe";
import { PictureAttach } from "../../telephony/share.vibe";
import type { ScreenProps } from "../app-screen.ts";
import { Avatar, Button, EmptyState, Input, ListRow } from "../components/ui/index.ts";
import { openApp } from "./open.ts";
import { CommsBar } from "./CommsBar.tsx";
import { DraftBubble } from "./DraftBubble.tsx";
import { MessageBubble } from "./MessageBubble.tsx";
import { deleteNoticeText, isAskSentence, matchesThread, phoneNoticeText, queryOf, sendProblemText, shortWhen, threadTitle } from "./present.ts";
import { ListAsk } from "../../telephony/list-ask.vibe";
import { runtime, type TelephonyRuntime } from "./runtime.ts";
import { useComms } from "./useComms.ts";

export interface ThreadListProps {
  /** Messages' state: conversations, access, failure and the query. */
  messages: Messages;
  /** The time the rows are placed against. */
  now: number;
  /** Open a conversation. */
  onOpen: (threadId: string) => void;
  /** Allow SMS read access, Refresh and Load more. */
  onAllow: () => void;
  onRefresh: () => void;
  onMore: () => void;
  /** Clear Alpha's filter. */
  onClearQuery: () => void;
}

/**
 * The conversation list: unread in bold, an incomplete conversation offered to the system app, and an Alpha filter chip.
 * @model spec/telephony/messages.md
 * @design design.md
 */
export function ThreadList({ messages, now, onOpen, onAllow, onRefresh, onMore, onClearQuery }: ThreadListProps) {
  const query = queryOf(messages.listQuery);
  const rows = messages.threads.filter((t) => matchesThread(threadTitle(t.title, t.addresses), t.snippet, query.text));
  if (messages.access === "SmsNotGranted") return <EmptyState title="Allow messages"><Button onClick={onAllow}>Allow</Button></EmptyState>;
  if (messages.failed) return <EmptyState title="Messages could not be read"><Button variant="secondary" onClick={onRefresh}>Refresh</Button></EmptyState>;
  if (!messages.busy && messages.access === "SmsGranted" && messages.threads.length === 0) return <EmptyState title="No messages" />;
  return (
    <div className="flex flex-col">
      {query.chip && (
        <div className="px-4 py-2">
          <Button variant="secondary" size="sm" aria-label={`Clear filter ${query.chip}`} onClick={onClearQuery}>{query.chip}<X aria-hidden /></Button>
        </div>
      )}
      {query.text && rows.length === 0 && messages.threads.length > 0 && <EmptyState title="No matches" />}
      <ul className="divide-y divide-border">
        {rows.map((t) => {
          const title = t.complete ? threadTitle(t.title, t.addresses) : "Conversation content unavailable";
          return (
            <li key={t.id}>
              <ListRow
                title={<span className={t.unread ? "font-semibold" : undefined}>{title}</span>}
                detail={t.complete ? t.snippet : "Use the system messaging app to view this conversation."}
                leading={t.addresses.length > 1 ? <Users aria-hidden /> : <Avatar name={title} />}
                trailing={<span className="font-mono text-xs uppercase tabular-nums text-muted-foreground">{shortWhen(t.date, now)}</span>}
                disabled={!t.complete}
                aria-label={`${title}, ${shortWhen(t.date, now)}${t.unread ? ", unread" : ""}`}
                onClick={() => onOpen(t.id)}
              />
            </li>
          );
        })}
      </ul>
      {messages.more && <Button variant="ghost" onClick={onMore}>Load more</Button>}
    </div>
  );
}

export interface MessagesScreenProps extends ScreenProps {
  /** The runtime the screen runs on. */
  runtime?: TelephonyRuntime;
}

/**
 * Messages on the Alpha image: the list, a conversation with its draft, or a new message, and the one bar.
 * @model spec/telephony/messages.md
 * @design design.md
 */
export function MessagesScreen({ route, runtime: on = runtime }: MessagesScreenProps) {
  const { state: m = messagesInitial, send, can } = useMessagesMachine(on);
  const stage = useComms(on);
  const [notice, setNotice] = useState("");
  const [answer, setAnswer] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    let visit = on.runFork(MessagesView.use((v) => v.visit()));
    if (route?.startsWith("compose:")) {
      const number = normalizePhoneNumber(route.slice("compose:".length));
      send({ type: "composeOpened" });
      if (number) on.runFork(DraftSends.use((d) => d.addRecipient(number)));
    }
    if (route?.startsWith("thread:")) on.runFork(MessagesView.use((v) => v.openThread(route.slice("thread:".length))));
    stage.show("MessagesApp", "ListSubject", "messages:list:");
    const visibility = () => {
      visit.interruptUnsafe();
      if (!document.hidden) {
        visit = on.runFork(MessagesView.use((v) => v.visit()));
        on.runFork(MessagesView.use((v) => v.openNotice(true)));
      }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      visit.interruptUnsafe();
    };
  }, [on, route]);

  const open = m.view.tag === "InThread" ? m.view : null;
  const thread = open ? open.threadId : "new";
  const slot = slotOf(stage.drafts.slots, thread);
  const listed = open ? m.threads.find((t) => t.id === open.threadId) : undefined;
  const title = open ? threadTitle(listed?.title ?? "", open.addresses) : threadTitle("", slot.recipients);
  const chatOpen = stage.comms.height !== "SheetClosed";
  const person = open !== null || m.view.tag === "Composing";
  const recipients = open ? open.addresses.map(normalizePhoneNumber).filter((n): n is NonNullable<typeof n> => n !== null) : slot.recipients;
  const canSend = slot.outcome !== "Sending" && recipients.length > 0 && (slot.text.trim() !== "" || slot.pictures.length > 0);
  const listQuery = queryOf(m.listQuery);
  const now = m.readAt || Date.now();

  const sendDraft = async () => {
    const problem: SendProblem | undefined = await on.runPromise(DraftSends.use((d) => d.send(thread)));
    setNotice(problem ? sendProblemText(problem) : "");
  };
  const typeToPerson = (text: string) => stage.sendDrafts({ type: "ownerTyped", thread, recipients, text }, "Owner");
  const openThread = (threadId: string) => {
    on.runFork(MessagesView.use((v) => v.openThread(threadId)));
    stage.show("MessagesApp", "ThreadSubject", `messages:thread:${threadId}`);
  };
  const back = () => {
    if (stage.back()) return;
    if (open) {
      on.runFork(MessagesView.use((v) => v.closeThread()));
      stage.show("MessagesApp", "ListSubject", "messages:list:");
    } else if (m.view.tag === "Composing") on.runFork(MessagesView.use((v) => v.pickerClose()));
    else if (m.searching) send({ type: "searchClosed" });
  };
  const sole = open && open.addresses.length === 1 ? normalizePhoneNumber(open.addresses[0]) : null;
  const attach = async () => {
    const answer = await on.runPromise(PictureAttach.use((p) => p.attach(thread)));
    setNotice(answer === "refused" ? "Only JPEG, PNG and GIF pictures up to 1 MB, five at most, can be sent." : "");
  };

  return (
    <section aria-label="Messages" className="flex h-full flex-col bg-background text-foreground">
      <header className="flex items-center gap-2 px-4 pt-4 pb-2">
        {(open || m.view.tag === "Composing") && <Button variant="ghost" size="icon" aria-label="Back" onClick={back}><ArrowLeft aria-hidden /></Button>}
        {open && <Avatar name={title} />}
        <h1 className="min-w-0 flex-1 truncate font-serif text-2xl">{open ? title : m.view.tag === "Composing" ? "New message" : "Messages"}</h1>
        {sole && (
          <Button variant="ghost" size="icon" aria-label={`Call ${title}`} onClick={async () => setNotice(phoneNoticeText({ tag: "Placement", outcome: await on.runPromise(placeOwnerCall(sole)) }))}>
            <PhoneIcon aria-hidden />
          </Button>
        )}
        {m.view.tag === "ThreadList" && !m.searching && (
          <>
            <Button variant="ghost" size="icon" aria-label="Search messages" onClick={() => can({ type: "searchOpened" }) && send({ type: "searchOpened" })}><Search aria-hidden /></Button>
            <Button variant="ghost" size="icon" aria-label="New message" onClick={() => can({ type: "composeOpened" }) && send({ type: "composeOpened" })}><Plus aria-hidden /></Button>
          </>
        )}
        {m.searching && (
          <Input autoFocus aria-label="Search messages" value={listQuery.text} onChange={(event) => send({ type: "queryTyped", typed: event.target.value })} className="flex-1" />
        )}
      </header>
      {(notice || answer) && <p role="status" className="px-4 text-sm text-muted-foreground">{notice || answer}</p>}
      {deleteNoticeText(m.deleteNotice) && <p role="status" className="px-4 text-sm text-muted-foreground">{deleteNoticeText(m.deleteNotice)}</p>}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {m.view.tag === "ThreadList" && (
          <ThreadList
            messages={m}
            now={now}
            onOpen={openThread}
            onAllow={() => on.runFork(MessagesView.use((v) => v.allow("sms")))}
            onRefresh={() => on.runFork(MessagesView.use((v) => v.refresh(false)))}
            onMore={() => on.runFork(MessagesView.use((v) => v.refresh(true)))}
            onClearQuery={() => send({ type: "queryCleared" })}
          />
        )}
        {m.view.tag === "Composing" && (
          <div className="flex flex-col gap-2 px-4">
            <Input
              aria-label="To"
              placeholder="To"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                on.runFork(MessagesView.use((v) => v.pickerQuery(event.target.value)));
              }}
              onKeyDown={(event) => {
                const number = normalizePhoneNumber(query);
                if (event.key !== "Enter" || !number) return;
                event.preventDefault();
                on.runFork(DraftSends.use((d) => d.addRecipient(number)));
                setQuery("");
              }}
            />
            {slot.recipients.length > 0 && (
              <ul aria-label="Recipients" className="flex flex-wrap gap-1">
                {slot.recipients.map((number) => (
                  <li key={number}>
                    <Button variant="secondary" size="sm" aria-label={`Remove ${number}`} onClick={() => stage.sendDrafts({ type: "recipientsChanged", thread: "new", recipients: slot.recipients.filter((r) => r !== number) }, "Owner")}>
                      {number}<X aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {m.picker.tag === "PickerOpen" && (
              <ul aria-label="Contacts" className="divide-y divide-border">
                {m.picker.needsAccess && <li><Button variant="secondary" onClick={() => on.runFork(MessagesView.use((v) => v.allow("sms")))}>Allow Contacts</Button></li>}
                {m.picker.choices.filter((c) => !slot.recipients.includes(c.number)).map((c) => (
                  <li key={c.key}>
                    <ListRow title={c.title} detail={c.number} leading={<Avatar name={c.title} />} aria-label={`${c.title}, ${c.number}`} onClick={() => {
                      setQuery("");
                      on.runFork(MessagesView.use((v) => v.pick(c.key)));
                    }} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {open && (
          <div data-alpha-messages-thread className="flex flex-1 flex-col justify-end gap-2 px-4 py-2">
            {m.more && <Button variant="ghost" onClick={() => on.runFork(MessagesView.use((v) => v.refresh(true)))}>Load earlier</Button>}
            {[...m.rows].sort((a, b) => a.date - b.date).map((row) => (
              <MessageBubble
                key={row.id}
                row={row}
                menu={m.menu.tag === "MenuOpen" && m.menu.rowId === row.id ? (m.menu.confirm ? "confirming" : "open") : "closed"}
                deleteBlocked={m.uncertain.includes(row.id)}
                deleting={m.deleting}
                onMenu={() => can({ type: "menuOpened", rowId: row.id }) && send({ type: "menuOpened", rowId: row.id })}
                onDeleteAsked={() => can({ type: "deleteAsked" }) && send({ type: "deleteAsked" })}
                onDeleteCancelled={() => can({ type: "menuClosed" }) && send({ type: "menuClosed" })}
                onDeleteConfirmed={() => on.runFork(MessagesView.use((v) => v.deleteConfirmed()))}
                onLink={(href) => openApp("browser", href)}
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
                onSend={() => void sendDraft()}
                onEdit={() => {
                  stage.sendDrafts({ type: "adopted", thread }, "Owner");
                  stage.closeChat();
                }}
                onText={(text) => stage.sendDrafts({ type: "alphaDraftEdited", thread, text }, "Owner")}
                onDiscard={() => stage.sendDrafts({ type: "discarded", thread }, "Owner")}
                onUndo={() => stage.sendDrafts({ type: "undone", thread }, "Owner")}
              />
            )}
          </div>
        )}
      </div>
      {slot.pictures.length > 0 && (
        <ul aria-label="Pictures" className="flex gap-1 px-4 py-1">
          {slot.pictures.map((p) => (
            <li key={p.pictureName}>
              <Button variant="secondary" size="sm" aria-label={`Remove ${p.pictureName}`} onClick={() => on.runFork(DraftSends.use((d) => d.removePicture(thread, p.pictureName)))}>{p.pictureName}<X aria-hidden /></Button>
            </li>
          ))}
        </ul>
      )}
      <CommsBar
        comms={stage.comms}
        person={person ? title : ""}
        value={chatOpen ? stage.request : person ? slot.text : listQuery.chip ? "" : listQuery.text}
        onText={(text) => chatOpen ? stage.setRequest(text) : person ? typeToPerson(text) : send({ type: "queryTyped", typed: text })}
        canSubmit={chatOpen ? stage.request.trim() !== "" : person ? canSend : isAskSentence(listQuery.text)}
        onSubmit={() => {
          if (chatOpen) stage.submitRequest();
          else if (person) void sendDraft();
          else {
            const asked = listQuery.text;
            send({ type: "queryTyped", typed: "" });
            void on.runPromise(ListAsk.use((l) => l.ask("messages", asked))).then((line) => (line === null ? stage.ask(asked) : setAnswer(line)));
          }
        }}
        onAlpha={stage.openAlpha}
        onBack={stage.closeChat}
        onAttach={person ? () => void attach() : undefined}
      />
    </section>
  );
}
