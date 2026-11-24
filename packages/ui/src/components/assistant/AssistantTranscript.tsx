import type { ComponentProps } from "react";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
import { EmptyState } from "../EmptyState.tsx";
import { Mark } from "../Mark.tsx";
import { Skeleton } from "../Skeleton.tsx";
import { AssistantMessage, type AssistantMessageProps } from "./AssistantMessage.tsx";
import { AssistantTurnNote, type AssistantTurnNoteProps } from "./AssistantTurnNote.tsx";

export type AssistantTranscriptProps = Omit<ComponentProps<"div">, "children"> & {
  /** The messages of the conversation showing, oldest first, each with a key that stays its own. */
  messages: (AssistantMessageProps & { id: string })[];
  /** Whether the page of messages is being read, was read, or could not be. */
  status?: "loading" | "loaded" | "failed";
  /** Where the last turn stands, below the last message. */
  turn?: AssistantTurnNoteProps;
  /** Reads the page again after it failed. */
  onRetry?: () => void;
  /** Reads older messages around the first one showing. */
  onEarlier?: () => void;
  /** Reads newer messages around the last one showing. */
  onLater?: () => void;
  /** Goes back to the conversation this one was forked from; offered only in a fork. */
  onReturnToOriginal?: () => void;
};

const toEnd = (element: HTMLElement | null) => element?.scrollIntoView({ block: "end" });

/**
 * The messages of the conversation showing, oldest first and kept at the newest: its states are empty, loading, failed
 * and showing a fork with the way back.
 * @model spec/app/assistant/chats.md
 */
export function AssistantTranscript({ messages, status = "loaded", turn, onRetry, onEarlier, onLater, onReturnToOriginal, className, ...props }: AssistantTranscriptProps) {
  const body = () => {
    if (status === "loading") return <div aria-busy className="flex flex-col gap-4"><Skeleton className="h-10 w-2/3 self-end" /><Skeleton className="h-16 w-4/5" /><Skeleton className="h-10 w-1/2 self-end" /></div>;
    if (status === "failed") return <EmptyState title="Messages did not load">{onRetry ? <Button variant="secondary" onClick={onRetry}>Try again</Button> : null}</EmptyState>;
    if (!messages.length && !turn) return <EmptyState icon={<Mark />} title="Ask anything" />;
    return (
      <>
        {onEarlier ? <Button variant="ghost" size="sm" className="self-center" onClick={onEarlier}><ChevronUp aria-hidden />Earlier</Button> : null}
        {messages.map(({ id, ...message }, index) => (
          <div key={id} ref={index === messages.length - 1 && !turn ? toEnd : undefined}><AssistantMessage {...message} /></div>
        ))}
        {onLater ? <Button variant="ghost" size="sm" className="self-center" onClick={onLater}><ChevronDown aria-hidden />Later</Button> : null}
        {turn ? <div ref={toEnd}><AssistantTurnNote {...turn} /></div> : null}
      </>
    );
  };
  return (
    <div role="log" aria-label="Conversation" tabIndex={0} className={cn(focusRing, "flex min-h-0 flex-col gap-5 overflow-y-auto px-4 py-2 focus-visible:-outline-offset-focus", className)} {...props}>
      {onReturnToOriginal ? <Button variant="ghost" size="sm" className="self-start" onClick={onReturnToOriginal}><ArrowLeft aria-hidden />Original chat</Button> : null}
      {body()}
    </div>
  );
}
