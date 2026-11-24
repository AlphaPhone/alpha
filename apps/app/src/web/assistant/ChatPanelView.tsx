// spec/assistant/reply.md, "Story: Read a reply with its cards"; spec/assistant/send.md, "Story: Send a message and know what happened to it"; spec/assistant/approvals.md, "Story: Approve an action card once, from wherever it is shown"; spec/assistant/search.md, "Story: Find something I said in an earlier chat"; spec/assistant/recovery.md, "Restart is offered only while the resident is refused and holds a reviewable recovery, once per tap"
import { History, MessageSquarePlus, Plus, Search } from "lucide-react";
import type { ReactNode } from "react";
import { copy } from "../../assistant/presentation.vibe";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Button, ScrollArea } from "../components/ui/index.ts";
import { ComposerBar, type ComposerBarProps } from "./ComposerBar.tsx";
import { Transcript, type TranscriptProps } from "./Transcript.tsx";

/** The conversation's rows, its composer, search, and the owner's answers to each, as the assistant's machines hold them. */
export type ChatPanelViewProps = Omit<TranscriptProps, "draftEmpty" | "emptyText"> & Omit<ComposerBarProps, "typing" | "dictation" | "placeholder" | "locationShared"> & {
  /** Chat search is open, so the search panel shows in place of the transcript. */
  searching: boolean;
  /** The search panel shown while search is open. */
  search?: ReactNode;
  /** The telephony review rows shown under the transcript. */
  reviews?: ReactNode;
  /** The running voice conversation's controls, or its last notice, and the disclosure. */
  voice?: ReactNode;
  /** The dictation control beside the editor, filling this draft. */
  dictation?: ReactNode;
  /** The owner opened chat search. */
  onSearch: () => void;
  /** The owner started a new chat. */
  onNewChat: () => void;
  /** The owner opened Agent activity. */
  onActivity: () => void;
};

/**
 * The assistant's conversation as its machines hold it: transcript, cards and composer, with the chat actions menu and search.
 * @model spec/assistant/send.md
 */
export function ChatPanelView(props: ChatPanelViewProps) {
  const { rows, typing, text, searching } = props;
  return (
    <section aria-label="Assistant" className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Chat actions" disabled={typing}><Plus className="size-5" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={props.onAttach}><Plus aria-hidden className="size-4" />Attach media</DropdownMenuItem>
            <DropdownMenuItem onSelect={props.onSearch}><Search aria-hidden className="size-4" />Search chat</DropdownMenuItem>
            <DropdownMenuItem onSelect={props.onNewChat}><MessageSquarePlus aria-hidden className="size-4" />New chat</DropdownMenuItem>
            <DropdownMenuItem onSelect={props.onActivity}><History aria-hidden className="size-4" />Agent activity</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      {searching
        ? props.search
        : (
          <ScrollArea className="min-h-0 flex-1 px-4">
            <Transcript
              rows={rows} typing={typing} draftEmpty={text.trim() === ""} canFork={props.canFork} cloud={props.cloud}
              emergency={props.emergency} ownAddress={props.ownAddress} busyCard={props.busyCard} now={props.now} emptyText={copy.emptyChat}
              onQuote={props.onQuote}
              onEdit={props.onEdit}
              onApprove={props.onApprove} onDecline={props.onDecline}
              onOpenCard={props.onOpenCard}
              onChoose={props.onChoose}
              onListen={props.onListen}
              onOpenChange={props.onOpenChange}
              onPlan={props.onPlan}
              onOpenRun={props.onOpenRun}
              onReviewApproval={props.onReviewApproval}
              onOpenMap={props.onOpenMap}
              onEmail={props.onEmail}
            />
            {props.reviews}
          </ScrollArea>
        )}
      {props.voice}
      <ComposerBar
        text={text} files={props.files} typing={typing} canSend={props.canSend} unsettled={props.unsettled}
        notice={props.notice} target={props.target}
        disclosure={props.disclosure}
        onText={props.onText}
        onSend={props.onSend}
        onStop={props.onStop}
        onTalk={props.onTalk}
        onAttach={props.onAttach}
        onRemoveFile={props.onRemoveFile}
        onClearTarget={props.onClearTarget}
        onReviewUnsettled={props.onReviewUnsettled}
        dictation={props.dictation}
        restartOffered={props.restartOffered}
        restartBusy={props.restartBusy}
        onRestart={props.onRestart}
      />
    </section>
  );
}
