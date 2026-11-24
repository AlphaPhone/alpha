// spec/telephony/messages.md, "Story: Read my conversations while Messages is open"; spec/telephony/messages.md, "Story: Open a conversation"; spec/telephony/messages.md, "Story: Start a new message"; spec/telephony/messages.md, "Story: Find a conversation"; spec/telephony/messages.md, "Story: Copy or delete one message"; spec/telephony/drafts.md, "Story: Send only what I reviewed, once"; spec/telephony/comms.md, "Story: Address the person or Alpha from one bar"
import { useCallback, useState } from "react";
import { useMachine as useMessagesMachine } from "../../../gen/telephony__messages.react.ts";
import { initial as messagesInitial } from "../../../gen/telephony__messages.ts";
import { DraftSends, type SendProblem, type SimChoice } from "../../telephony/drafts.vibe";
import { MessagesView } from "../../telephony/messages.vibe";
import { PictureAttach } from "../../telephony/share.vibe";
import type { ScreenProps } from "../app-screen.ts";
import { openApp } from "./open.ts";
import { MessagesScreenView } from "./MessagesScreenView.tsx";
import { phoneNoticeText, sendProblemText } from "./present.ts";
import { act, perform, start } from "../shell/services.ts";
import { runtime } from "./runtime.ts";
import { backIn } from "./back.ts";
import { stageView, useComms } from "./useComms.ts";

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
  const [sims, setSims] = useState<readonly SimChoice[]>([]);
  const visit = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const stop = start(MessagesView.use((v) => v.visit(route)));
    stage.show("MessagesApp", "ListSubject", "messages:list:");
    return stop;
  }, [route]);
  const sendDraft = async (thread: string) => {
    const problem: SendProblem | undefined = await perform(DraftSends.use((d) => d.send(thread)));
    setNotice(problem ? sendProblemText(problem) : "");
    setSims(problem === "sim-required" ? await perform(DraftSends.use((d) => d.sims())) : []);
  };
  const draft = stage.sendDrafts;
  return (
    <MessagesScreenView
      ref={visit}
      {...stageView(stage)}
      messages={m}
      drafts={stage.drafts}
      now={m.readAt || Date.now()}
      notice={notice}
      answer={answer}
      sims={sims}
      onBack={() => void backIn("messages")}
      onCallThread={async () => {
        const outcome = await perform(MessagesView.use((v) => v.callThread()));
        setNotice(outcome === undefined ? "" : phoneNoticeText({ tag: "Placement", outcome }));
      }}
      onSearchOpened={() => can({ type: "searchOpened" }) && send({ type: "searchOpened" })}
      onComposeOpened={() => can({ type: "composeOpened" }) && send({ type: "composeOpened" })}
      onQuery={(typed) => send({ type: "queryTyped", typed })}
      onOpenThread={(threadId) => {
        act(MessagesView.use((v) => v.openThread(threadId)));
        stage.show("MessagesApp", "ThreadSubject", `messages:thread:${threadId}`);
      }}
      onAllow={() => act(MessagesView.use((v) => v.allow("sms")))}
      onRefresh={() => act(MessagesView.use((v) => v.refresh(false)))}
      onMore={() => act(MessagesView.use((v) => v.refresh(true)))}
      onClearQuery={() => send({ type: "queryCleared" })}
      onPickerQuery={(query) => act(MessagesView.use((v) => v.pickerQuery(query)))}
      onAddRecipient={(number) => act(DraftSends.use((d) => d.addRecipient(number)))}
      onPick={(key) => act(MessagesView.use((v) => v.pick(key)))}
      onRecipientsChanged={(recipients) => draft({ type: "recipientsChanged", thread: "new", recipients }, "Owner")}
      onMenu={(rowId) => can({ type: "menuOpened", rowId }) && send({ type: "menuOpened", rowId })}
      onDeleteAsked={() => can({ type: "deleteAsked" }) && send({ type: "deleteAsked" })}
      onDeleteCancelled={() => can({ type: "menuClosed" }) && send({ type: "menuClosed" })}
      onDeleteConfirmed={() => act(MessagesView.use((v) => v.deleteConfirmed()))}
      onLink={(href) => openApp("browser", href)}
      onOwnerTyped={(thread, recipients, text) => draft({ type: "ownerTyped", thread, recipients, text }, "Owner")}
      onSend={(thread) => void sendDraft(thread)}
      onAdopt={(thread) => draft({ type: "adopted", thread }, "Owner")}
      onAlphaDraftEdited={(thread, text) => draft({ type: "alphaDraftEdited", thread, text }, "Owner")}
      onDiscard={(thread) => draft({ type: "discarded", thread }, "Owner")}
      onUndo={(thread) => draft({ type: "undone", thread }, "Owner")}
      onChooseSim={(thread, sim) => {
        draft({ type: "simChosen", thread, sim }, "Owner");
        setSims([]);
        setNotice("");
      }}
      onAttach={async (thread) => {
        const attached = await perform(PictureAttach.use((p) => p.attach(thread)));
        setNotice(attached === "refused" ? "Only JPEG, PNG and GIF pictures up to 1 MB, five at most, can be sent." : "");
      }}
      onRemovePicture={(thread, pictureName) => act(DraftSends.use((d) => d.removePicture(thread, pictureName)))}
      onAsk={(text) => stage.askList("messages", text, setAnswer)}
    />
  );
}
