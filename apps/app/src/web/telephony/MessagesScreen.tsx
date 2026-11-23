// spec/telephony/messages.md, "Story: Read my conversations while Messages is open"; spec/telephony/messages.md, "Story: Open a conversation"; spec/telephony/messages.md, "Story: Start a new message"; spec/telephony/messages.md, "Story: Find a conversation"; spec/telephony/messages.md, "Story: Copy or delete one message"; spec/telephony/drafts.md, "Story: Send only what I reviewed, once"; spec/telephony/comms.md, "Story: Address the person or Alpha from one bar"
import { normalizePhoneNumber } from "@elizaos/os/bridges/definitions/phone";
import { ArrowLeft, Phone as PhoneIcon, Plus, Search, X } from "lucide-react";
import { useCallback, useState } from "react";
import { slotOf } from "../../../gen/telephony__drafts.ts";
import { useMachine as useMessagesMachine } from "../../../gen/telephony__messages.react.ts";
import { initial as messagesInitial, threadCallNumber } from "../../../gen/telephony__messages.ts";
import { DraftSends, type SendProblem, type SimChoice } from "../../telephony/drafts.vibe";
import { MessagesView } from "../../telephony/messages.vibe";
import { PictureAttach } from "../../telephony/share.vibe";
import type { ScreenProps } from "../app-screen.ts";
import { Avatar, Button, Input, ListRow } from "../components/ui/index.ts";
import { openApp } from "./open.ts";
import { CommsBar } from "./CommsBar.tsx";
import { RestoredProposal } from "./RestoredProposal.tsx";
import { DraftBubble } from "./DraftBubble.tsx";
import { MessageBubble } from "./MessageBubble.tsx";
import { deleteNoticeText, isAskSentence, phoneNoticeText, queryOf, sendProblemText, threadTitle } from "./present.ts";
import { ThreadList } from "./ThreadList.tsx";
import { act, perform, start } from "../shell/services.ts";
import { runtime } from "./runtime.ts";
import { backIn } from "./back.ts";
import { useComms } from "./useComms.ts";

/** Messages' screen props: the shell's route and close. */
export type MessagesScreenProps = ScreenProps;

/**
 * Messages on the Alpha image: the list, a conversation with its draft, or a new message, and the one bar.
 * @model spec/telephony/messages.md
 * @design design.md
 */
export function MessagesScreen({ route }: MessagesScreenProps) {
  const { state: m = messagesInitial, send, can } = useMessagesMachine(runtime);
  const stage = useComms();
  const [notice, setNotice] = useState("");
  const [answer, setAnswer] = useState("");
  const [query, setQuery] = useState("");
  const [sims, setSims] = useState<readonly SimChoice[]>([]);
  const visit = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const stop = start(MessagesView.use((v) => v.visit(route)));
    stage.show("MessagesApp", "ListSubject", "messages:list:");
    return stop;
  }, [route]);

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
  const readAt = m.readAt || Date.now();

  const sendDraft = async () => {
    const problem: SendProblem | undefined = await perform(DraftSends.use((d) => d.send(thread)));
    setNotice(problem ? sendProblemText(problem) : "");
    // With no default SMS SIM the owner picks the SIM; the next Send goes from it.
    setSims(problem === "sim-required" ? await perform(DraftSends.use((d) => d.sims())) : []);
  };
  const chooseSim = (sim: number) => {
    stage.sendDrafts({ type: "simChosen", thread, sim }, "Owner");
    setSims([]);
    setNotice("");
  };
  const typeToPerson = (text: string) => stage.sendDrafts({ type: "ownerTyped", thread, recipients, text }, "Owner");
  const openThread = (threadId: string) => {
    act(MessagesView.use((v) => v.openThread(threadId)));
    stage.show("MessagesApp", "ThreadSubject", `messages:thread:${threadId}`);
  };
  const back = () => void backIn("messages");
  const sole = threadCallNumber(m.view) !== "";
  const attach = async () => {
    const answer = await perform(PictureAttach.use((p) => p.attach(thread)));
    setNotice(answer === "refused" ? "Only JPEG, PNG and GIF pictures up to 1 MB, five at most, can be sent." : "");
  };

  return (
    <section ref={visit} aria-label="Messages" className="flex h-full flex-col bg-background text-foreground">
      <header className="flex items-center gap-2 px-4 pt-4 pb-2">
        {(open || m.view.tag === "Composing") && <Button variant="ghost" size="icon" aria-label="Back" onClick={back}><ArrowLeft aria-hidden /></Button>}
        {open && <Avatar name={title} />}
        <h1 className="min-w-0 flex-1 truncate font-display text-2xl">{open ? title : m.view.tag === "Composing" ? "New message" : "Messages"}</h1>
        {sole && (
          <Button variant="ghost" size="icon" aria-label={`Call ${title}`} onClick={async () => {
            const outcome = await perform(MessagesView.use((v) => v.callThread()));
            setNotice(outcome === undefined ? "" : phoneNoticeText({ tag: "Placement", outcome }));
          }}>
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
            now={readAt}
            onOpen={openThread}
            onAllow={() => act(MessagesView.use((v) => v.allow("sms")))}
            onRefresh={() => act(MessagesView.use((v) => v.refresh(false)))}
            onMore={() => act(MessagesView.use((v) => v.refresh(true)))}
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
                act(MessagesView.use((v) => v.pickerQuery(event.target.value)));
              }}
              onKeyDown={(event) => {
                const number = normalizePhoneNumber(query);
                if (event.key !== "Enter" || !number) return;
                event.preventDefault();
                act(DraftSends.use((d) => d.addRecipient(number)));
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
                {m.picker.needsAccess && <li><Button variant="secondary" onClick={() => act(MessagesView.use((v) => v.allow("sms")))}>Allow Contacts</Button></li>}
                {m.picker.choices.filter((c) => !slot.recipients.includes(c.number)).map((c) => (
                  <li key={c.key}>
                    <ListRow title={c.title} detail={c.number} leading={<Avatar name={c.title} />} aria-label={`${c.title}, ${c.number}`} onClick={() => {
                      setQuery("");
                      act(MessagesView.use((v) => v.pick(c.key)));
                    }} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {open && (
          <div data-alpha-messages-thread className="flex flex-1 flex-col justify-end gap-2 px-4 py-2">
            {m.more && <Button variant="ghost" onClick={() => act(MessagesView.use((v) => v.refresh(true)))}>Load earlier</Button>}
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
                onDeleteConfirmed={() => act(MessagesView.use((v) => v.deleteConfirmed()))}
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
              <Button variant="secondary" size="sm" aria-label={`Remove ${p.pictureName}`} onClick={() => act(DraftSends.use((d) => d.removePicture(thread, p.pictureName)))}>{p.pictureName}<X aria-hidden /></Button>
            </li>
          ))}
        </ul>
      )}
      {sims.length > 0 && (
        <div role="group" aria-label="Send from" className="flex flex-wrap items-center gap-2 px-4 py-1">
          <span className="text-sm text-muted-foreground">Send from</span>
          {sims.map((sim) => <Button key={sim.id} variant="secondary" size="sm" onClick={() => chooseSim(sim.id)}>{sim.label}</Button>)}
        </div>
      )}
      <RestoredProposal card={stage.card} onDismiss={stage.decline} />
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
            stage.askList("messages", listQuery.text, setAnswer);
          }
        }}
        onAlpha={stage.openAlpha}
        onEnd={stage.endCall}
        onBack={stage.closeChat}
        onAttach={person ? () => void attach() : undefined}
      />
    </section>
  );
}
