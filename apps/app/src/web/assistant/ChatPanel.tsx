// spec/assistant/reply.md, "Story: Read a reply with its cards"; spec/assistant/send.md, "Story: Send a message and know what happened to it"; spec/assistant/approvals.md, "Story: Approve an action card once, from wherever it is shown"; spec/assistant/search.md, "Story: Find something I said in an earlier chat"
import { Effect } from "effect";
import { History, MessageSquarePlus, Plus, Search } from "lucide-react";
import { useState } from "react";
import { initial as draftsStart } from "../../../gen/assistant__draft.ts";
import { useMachine as useDrafts } from "../../../gen/assistant__draft.react.ts";
import { initial as sendsStart, canSend } from "../../../gen/assistant__send.ts";
import { useMachine as useSends } from "../../../gen/assistant__send.react.ts";
import { disclosed } from "../../../gen/assistant__context.ts";
import { ChatAttachments } from "../../assistant/attachments.vibe";
import { Composer, draftText, draftUnsettled } from "../../assistant/composer.vibe";
import { copy } from "../../assistant/presentation.vibe";
import { DeviceReview } from "../../assistant/review.vibe";
import { ChatSearch } from "../../assistant/search.vibe";
import { AssistantFlows } from "../../assistant/flows.vibe";
import { pickForChat } from "../../assistant/files-bridge.vibe";
import { emptyTranscript, type ProposalCard, type Row } from "../../assistant/transcript.vibe";
import { unitsOf } from "../../assistant/units.vibe";
import { MapsHandoff } from "../../maps/handoff.vibe";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Button, ScrollArea } from "../components/ui/index.ts";
import { ChatSearchPanel } from "./ChatSearchPanel.tsx";
import { ComposerBar } from "./ComposerBar.tsx";
import { Transcript } from "./Transcript.tsx";
import { runtime } from "./runtime.ts";
import { emergencyNow, filesStream, inferenceOf, ownAddressNow, run, targetStream, transcriptStream } from "./services.ts";
import { useServiceStream } from "./use-stream.ts";

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
  const transcript = useServiceStream(runtime, "assistant/transcript", transcriptStream, emptyTranscript);
  const target = useServiceStream(runtime, "assistant/target", targetStream, undefined);
  const files = useServiceStream(runtime, "assistant/files", filesStream, []);
  const { state: drafts = draftsStart, send: sendDraft } = useDrafts(runtime);
  const { state: sends = sendsStart } = useSends(runtime);
  const [searching, setSearching] = useState(false);
  const [busyCard, setBusyCard] = useState<string | undefined>(undefined);
  const text = draftText(drafts);
  const inference = inferenceOf();
  const now = Date.now();
  const sendable = !draftUnsettled(drafts) && (canSend({ ...sends, composer: unitsOf(text) }, false, true, []) || (files.length > 0 && !sends.typing));
  const act = (card: ProposalCard, work: Effect.Effect<Row, unknown, DeviceReview | Composer>) => {
    setBusyCard(card.proposalId);
    runtime.runPromise(Effect.flatMap(work, (row) => Effect.flatMap(Effect.service(Composer), (composer) => composer.replaceRow(row))))
      .finally(() => setBusyCard(undefined));
  };
  const approve = (card: ProposalCard) => act(card, Effect.flatMap(Effect.service(DeviceReview), (review) => Effect.map(review.approve(card), (done) => ({ kind: "card", id: `card:${card.proposalId}`, card: done.card } satisfies Row))));
  const decline = (card: ProposalCard) => act(card, Effect.flatMap(Effect.service(DeviceReview), (review) => Effect.map(review.decline(card), (done) => ({ kind: "card", id: `card:${card.proposalId}`, card: done } satisfies Row))));
  const pick = () => { runtime.runFork(Effect.catchCause(pickForChat(files.length), () => Effect.void)); };
  const onEmail = (row: Extract<Row, { kind: "email" }>, act: "edit" | "send" | "decline", fields: { readonly to: string; readonly subject: string; readonly body: string }) => {
    const id = row.id;
    const work = Effect.flatMap(Effect.service(AssistantFlows), (flows) =>
      act === "edit" ? flows.editEmail(id, row.card, fields.to.trim() !== "", fields.body.trim() !== "")
      : act === "send" ? flows.sendEmail(id, row.card, fields) : flows.declineEmail(id, row.card));
    runtime.runFork(Effect.catchCause(Effect.flatMap(work, (card) => Effect.flatMap(Effect.service(Composer), (c) => c.replaceRow({ ...row, ...fields, card }))), () => Effect.void));
  };
  const composer = (use: (c: Composer.Shape) => Effect.Effect<unknown>) => run(Effect.flatMap(Effect.service(Composer), use));
  return (
    <section aria-label="Assistant" className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Chat actions" disabled={sends.typing}><Plus className="size-5" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={pick}><Plus aria-hidden className="size-4" />Attach media</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { run(Effect.flatMap(Effect.service(ChatSearch), (search) => search.start())); setSearching(true); }}><Search aria-hidden className="size-4" />Search chat</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => composer((c) => c.open(null, false))}><MessageSquarePlus aria-hidden className="size-4" />New chat</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => open("settings", "agent-activity")}><History aria-hidden className="size-4" />Chat history</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      {searching
        ? <ChatSearchPanel onClose={() => setSearching(false)} />
        : (
          <ScrollArea className="min-h-0 flex-1 px-4">
            <Transcript
              rows={transcript.rows} typing={sends.typing} draftEmpty={text.trim() === ""} canFork={transcript.conversation !== null} cloud={inference.provider}
              emergency={emergencyNow()} ownAddress={ownAddressNow()} busyCard={busyCard} now={now} emptyText={copy.emptyChat}
              onQuote={(quote) => composer((c) => c.aim({ kind: "reply", quote }))}
              onEdit={(row) => composer((c) => c.aim({ kind: "edit", messageId: row.id, text: row.text, requestId: crypto.randomUUID() }))}
              onApprove={approve} onDecline={decline}
              onOpenCard={(card) => open(card.destination ?? "home")}
              onChoose={(value) => composer((c) => c.send(value))}
              onPlan={() => open("account")}
              onOpenRun={(workflowId, runId) => open("workflows", `${workflowId}/${runId}`)}
              onOpenMap={(card, ordinal) => { runtime.runFork(Effect.catchCause(Effect.flatMap(Effect.service(MapsHandoff), (maps) => maps.openCard(card, { message: ordinal, session: 1, conversation: 1, revision: 0 })), () => Effect.void)); }}
              onEmail={onEmail}
            />
          </ScrollArea>
        )}
      <ComposerBar
        text={text} files={files} typing={sends.typing} canSend={sendable} unsettled={draftUnsettled(drafts)}
        notice={notices[drafts.notice]} target={target}
        disclosure={disclosed(inference.where) ? copy.hostedDisclosure(inference.provider) : undefined}
        onText={(value) => composer((c) => c.edit(value))}
        onSend={() => composer((c) => c.send())}
        onStop={() => composer((c) => c.stop())}
        onTalk={onTalk}
        onAttach={pick}
        onRemoveFile={(id) => run(Effect.flatMap(Effect.service(ChatAttachments), (attachments) => attachments.remove(id)))}
        onClearTarget={() => composer((c) => c.aim(undefined))}
        onReviewUnsettled={(restore) => { void sendDraft({ type: "reviewUnsettled", restore }); }}
      />
    </section>
  );
}
