// spec/assistant/reply.md, "Story: Read a reply with its cards"; spec/assistant/send.md, "Story: Send a message and know what happened to it"; spec/assistant/approvals.md, "Story: Approve an action card once, from wherever it is shown"; spec/assistant/search.md, "Story: Find something I said in an earlier chat"; spec/assistant/recovery.md, "Restart is offered only while the resident is refused and holds a reviewable recovery, once per tap"; spec/maps/cards.md, "A tap sends one answer while the composer is quiet; a draft or an edit says why it waits; a failed send asks again"; spec/assistant/reply.md, "A failed reply offers the fix the agent named, and a rate limit shows its live wait, never retrying the message"; spec/assistant/send.md, "A dictated draft sent exactly as inserted is timed as a voice turn, and its reply is never spoken"
import { Effect } from "effect";
import { History, MessageSquarePlus, Plus, Search } from "lucide-react";
import { useState } from "react";
import { initial as draftsStart } from "../../../gen/assistant__draft.ts";
import { useMachine as useDrafts } from "../../../gen/assistant__draft.react.ts";
import { initial as sendsStart, canSend } from "../../../gen/assistant__send.ts";
import { useMachine as useSends } from "../../../gen/assistant__send.react.ts";
import { disclosed } from "../../../gen/assistant__context.ts";
import { initial as searchStart } from "../../../gen/assistant__search.ts";
import { useMachine as useSearch } from "../../../gen/assistant__search.react.ts";
import { ChatAttachments } from "../../assistant/attachments.vibe";
import { Composer, draftText, draftUnsettled } from "../../assistant/composer.vibe";
import { copy, planDestination } from "../../assistant/presentation.vibe";
import { DeviceReview } from "../../assistant/review.vibe";
import { ChatSearch } from "../../assistant/search.vibe";
import { AssistantFlows } from "../../assistant/flows.vibe";
import { pickForChat } from "../../assistant/files-bridge.vibe";
import { emptyTranscript, type ProposalCard, type Row } from "../../assistant/transcript.vibe";
import { plainText } from "../../assistant/reply-lines.vibe";
import { AgentRestart } from "../../assistant/restart.vibe";
import { VoiceConversation } from "../../voice/conversation.vibe";
import { unitsOf } from "../../assistant/units.vibe";
import { MapsHandoff } from "../../maps/handoff.vibe";
import { newId } from "../../platform/ids.ts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Button, ScrollArea } from "../components/ui/index.ts";
import { DictationControl } from "../voice/DictationControl.tsx";
import { ReviewRows } from "../telephony/ReviewRows.tsx";
import { ChatSearchPanel } from "./ChatSearchPanel.tsx";
import { ComposerBar } from "./ComposerBar.tsx";
import { Transcript } from "./Transcript.tsx";
import { dictationTargetNow, emergencyNow, filesStream, inferenceOf, ownAddressNow, restartBusyStream, restartStream, targetStream, transcriptStream } from "./services.ts";
import { act, perform, useServiceStream } from "../shell/services.ts";
import { runtime } from "./runtime.ts";

/** Where the conversation sends what it cannot show itself. */
export type ChatPanelProps = {
  /** Open an app view the agent or a card named. */
  open: (app: string, route?: string) => void;
  /** Ask the voice area to start a conversation. */
  onTalk: () => void;
};

const notices = {
  Quiet: undefined, BackInComposer: copy.backInComposer, KeptInOwnConversation: copy.keptInOwnConversation, MaySent: undefined,
  SavedLocally: copy.savedLocally, TooLong: copy.tooLong, StorageUnavailable: copy.storageUnavailable,
} as const;

/**
 * The assistant's conversation: transcript, cards and composer, with the chat actions menu and search.
 * @model spec/assistant/send.md
 */
export function ChatPanel({ open, onTalk }: ChatPanelProps) {
  const transcript = useServiceStream("assistant/transcript", transcriptStream, emptyTranscript);
  const target = useServiceStream("assistant/target", targetStream, undefined);
  const files = useServiceStream("assistant/files", filesStream, []);
  const { state: drafts = draftsStart, send: sendDraft } = useDrafts(runtime);
  const { state: sends = sendsStart } = useSends(runtime);
  const { state: searchState = searchStart } = useSearch(runtime);
  const restartOffered = useServiceStream("assistant/restart", restartStream, false);
  const restartBusy = useServiceStream("assistant/restart-busy", restartBusyStream, false);
  const searching = searchState.open;
  const text = draftText(drafts);
  const inference = inferenceOf();
  const now = Date.now();
  const sendable = !draftUnsettled(drafts) && (canSend({ ...sends, composer: unitsOf(text) }, false, true, []) || (files.length > 0 && !sends.typing));
  const [busyCard, setBusyCard] = useState<string | undefined>(undefined);
  const decide = (card: ProposalCard, work: Effect.Effect<Row, unknown, DeviceReview | Composer>) => {
    setBusyCard(card.proposalId);
    perform(Effect.flatMap(work, (row) => Effect.flatMap(Effect.service(Composer), (composer) => composer.replaceRow(row))))
      .finally(() => setBusyCard(undefined));
  };
  const approve = (card: ProposalCard) => decide(card, Effect.flatMap(Effect.service(DeviceReview), (review) => Effect.map(review.approve(card), (done) => ({ kind: "card", id: `card:${card.proposalId}`, card: done.card } satisfies Row))));
  const decline = (card: ProposalCard) => decide(card, Effect.flatMap(Effect.service(DeviceReview), (review) => Effect.map(review.decline(card), (done) => ({ kind: "card", id: `card:${card.proposalId}`, card: done } satisfies Row))));
  const pick = () => { act(pickForChat(files.length)); };
  const onEmail = (row: Extract<Row, { kind: "email" }>, choice: "edit" | "send" | "decline", fields: { readonly to: string; readonly subject: string; readonly body: string }) => {
    const id = row.id;
    const work = Effect.flatMap(Effect.service(AssistantFlows), (flows) =>
      choice === "edit" ? flows.editEmail(id, row.card, fields.to.trim() !== "", fields.body.trim() !== "")
      : choice === "send" ? flows.sendEmail(id, row.card, fields) : flows.declineEmail(id, row.card));
    act(Effect.flatMap(work, (card) => Effect.flatMap(Effect.service(Composer), (c) => c.replaceRow({ ...row, ...fields, card }))));
  };
  const composer = (use: (c: Composer.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(Composer), use));
  const mapsComposer = (draft: boolean, editing: boolean) => act(Effect.flatMap(Effect.service(MapsHandoff), (maps) =>
    maps.setComposer({ busy: sends.typing, typing: false, recording: false, draft, editing, hidden: false, sheetOpen: false })));
  const offerOf = (ordinal: number) => ({ message: ordinal, revision: 0 });
  const choose = (value: string, ordinal: number | undefined) => act(Effect.flatMap(Effect.service(Composer), (c) =>
    ordinal === undefined ? c.send(value) : Effect.flatMap(Effect.service(MapsHandoff), (maps) => maps.answerChoice(offerOf(ordinal), c.send(value)))));
  const plan = (row: Extract<Row, { kind: "agent" }>) => {
    if (row.plan === undefined) return;
    const destination = planDestination(row.plan);
    if (destination.kind === "open") { open(destination.app, destination.route); return; }
    const at = transcript.rows.findIndex((each) => each.id === row.id);
    const asked = transcript.rows.slice(0, Math.max(0, at)).reverse().find((each) => each.kind === "user");
    if (asked?.kind === "user" && text.trim() === "") composer((c) => c.edit(asked.text));
  };
  const listen = (row: Extract<Row, { kind: "agent" }>) => {
    const text = plainText(row.segments);
    if (text !== "") act(Effect.flatMap(Effect.service(VoiceConversation), (voice) => voice.readAloud(text)));
  };
  return (
    <section aria-label="Assistant" className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Chat actions" disabled={sends.typing}><Plus className="size-5" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={pick}><Plus aria-hidden className="size-4" />Attach media</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => act(Effect.flatMap(Effect.service(ChatSearch), (search) => search.start()))}><Search aria-hidden className="size-4" />Search chat</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => composer((c) => c.open(null, false))}><MessageSquarePlus aria-hidden className="size-4" />New chat</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => open("assistant", "activity")}><History aria-hidden className="size-4" />Agent activity</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      {searching
        ? <ChatSearchPanel />
        : (
          <ScrollArea className="min-h-0 flex-1 px-4">
            <Transcript
              rows={transcript.rows} typing={sends.typing} draftEmpty={text.trim() === ""} canFork={transcript.conversation !== null} cloud={inference.provider}
              emergency={emergencyNow()} ownAddress={ownAddressNow()} busyCard={busyCard} now={now} emptyText={copy.emptyChat}
              onQuote={(quote) => composer((c) => c.aim({ kind: "reply", quote }))}
              onEdit={(row) => { mapsComposer(text.trim() !== "", true); composer((c) => c.aim({ kind: "edit", messageId: row.id, text: row.text, requestId: newId() })); }}
              onApprove={approve} onDecline={decline}
              onOpenCard={(card) => open(card.destination ?? "home")}
              onChoose={choose}
              onListen={listen}
              onOpenChange={(row) => open(row.app, row.route)}
              onPlan={plan}
              onOpenRun={(workflowId, runId) => open("workflows", `${workflowId}/${runId}`)}
              onOpenMap={(card, ordinal) => act(Effect.flatMap(Effect.service(MapsHandoff), (maps) => maps.openCard(card, offerOf(ordinal))))}
              onEmail={onEmail}
            />
            <ReviewRows />
          </ScrollArea>
        )}
      <ComposerBar
        text={text} files={files} typing={sends.typing} canSend={sendable} unsettled={draftUnsettled(drafts)}
        notice={notices[drafts.notice]} target={target}
        disclosure={disclosed(inference.where) ? copy.hostedDisclosure(inference.provider) : undefined}
        onText={(value) => { mapsComposer(value.trim() !== "", target?.kind === "edit"); composer((c) => c.edit(value)); }}
        onSend={() => composer((c) => c.send())}
        onStop={() => composer((c) => c.stop())}
        onTalk={onTalk}
        onAttach={pick}
        onRemoveFile={(id) => act(Effect.flatMap(Effect.service(ChatAttachments), (attachments) => attachments.remove(id)))}
        onClearTarget={() => { mapsComposer(text.trim() !== "", false); composer((c) => c.aim(undefined)); }}
        onReviewUnsettled={(restore) => { void sendDraft({ type: "reviewUnsettled", restore }); }}
        dictation={<DictationControl target={dictationTargetNow()} />}
        restartOffered={restartOffered}
        restartBusy={restartBusy}
        onRestart={() => act(Effect.flatMap(Effect.service(AgentRestart), (restart) => restart.restart()))}
      />
    </section>
  );
}
