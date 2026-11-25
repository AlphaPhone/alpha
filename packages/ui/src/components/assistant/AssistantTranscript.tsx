import { type ComponentProps, memo, useCallback, useRef } from "react";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
import { EmptyState } from "../EmptyState.tsx";
import { Skeleton } from "../Skeleton.tsx";
import { AssistantMessage, type AssistantMessageProps } from "./AssistantMessage.tsx";
import { AssistantTurnNote, type AssistantTurnNoteProps } from "./AssistantTurnNote.tsx";

type TranscriptMessage = AssistantMessageProps & { id: string };

export type AssistantTranscriptProps = Omit<ComponentProps<"div">, "children"> & {
  /** The messages of the conversation showing, oldest first, each with a key that stays its own. */
  messages: readonly TranscriptMessage[];
  /** The reply being written or its failure, after recorded messages. */
  liveMessages?: readonly TranscriptMessage[];
  /** The page being read, with the message that a history or search request opened it around. */
  position?: { page: string; around?: string };
  /** Whether the transcript is laid out in the open conversation. */
  visible?: boolean;
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

type TranscriptScroll = { page?: string; follows: boolean; paging?: { id: string; offset: number } };

function messageRow(content: HTMLElement, id: string) {
  return Array.from(content.querySelectorAll<HTMLElement>("[data-alpha-message-id]"))
    .find((row) => row.dataset.alphaMessageId === id);
}

function topIn(viewport: HTMLElement, row: HTMLElement) {
  return row.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
}

function followEnd(viewport: HTMLElement) {
  const selection = viewport.ownerDocument.getSelection();
  if (selection?.anchorNode && !selection.isCollapsed && viewport.contains(selection.anchorNode)) return;
  viewport.scrollTop = viewport.scrollHeight;
}

const MessageRows = memo(function MessageRows({ messages }: { messages: readonly TranscriptMessage[] }) {
  return messages.map(({ id, ...message }) => (
    <div key={id} data-alpha-message-id={id}><AssistantMessage {...message} /></div>
  ));
});

/**
 * The conversation as it was being read. New replies follow the end while it is in view; a history page or a search
 * hit opens around the message requested.
 * @model spec/app/assistant/chats.md
 */
export function AssistantTranscript({ messages, liveMessages, position, visible = true, status = "loaded", turn, onRetry, onEarlier, onLater, onReturnToOriginal, className, onScroll, ...props }: AssistantTranscriptProps) {
  const scroll = useRef<TranscriptScroll>({ follows: true });
  const page = position?.page;
  const around = position?.around;
  const placed = useCallback((content: HTMLDivElement | null) => {
    const viewport = content?.parentElement;
    if (!content || !viewport || !visible || status !== "loaded") return;
    const reading = scroll.current;
    if (reading.page !== page) {
      const row = around === undefined ? undefined : messageRow(content, around);
      if (row && around !== undefined) {
        const offset = reading.paging?.id === around ? reading.paging.offset : (viewport.clientHeight - row.offsetHeight) / 2;
        viewport.scrollTop += topIn(viewport, row) - offset;
      }
      reading.page = page;
      reading.follows = !row;
      reading.paging = undefined;
    }
    const follow = () => { if (reading.follows) followEnd(viewport); };
    follow();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(follow);
    observer.observe(viewport);
    observer.observe(content);
    return () => observer.disconnect();
  }, [around, page, status, visible]);
  const pageFrom = (button: HTMLElement, id: string | undefined, load: () => void) => {
    const content = button.parentElement;
    const viewport = content?.parentElement;
    const row = content && id !== undefined ? messageRow(content, id) : undefined;
    if (viewport && row && id !== undefined) scroll.current.paging = { id, offset: topIn(viewport, row) };
    load();
  };
  const body = () => {
    if (status === "loading") return <div aria-busy className="flex flex-col gap-4"><Skeleton className="h-10 w-2/3 self-end" /><Skeleton className="h-16 w-4/5" /><Skeleton className="h-10 w-1/2 self-end" /></div>;
    if (status === "failed") return <EmptyState title="Messages did not load">{onRetry ? <Button variant="secondary" onClick={onRetry}>Try again</Button> : null}</EmptyState>;
    return (
      <>
        {onEarlier ? <Button variant="ghost" size="sm" className="self-center" onClick={(event) => pageFrom(event.currentTarget, messages[0]?.id, onEarlier)}><ChevronUp aria-hidden />Earlier</Button> : null}
        <MessageRows messages={messages} />
        {liveMessages?.length ? <MessageRows messages={liveMessages} /> : null}
        {onLater ? <Button variant="ghost" size="sm" className="self-center" onClick={(event) => pageFrom(event.currentTarget, messages.at(-1)?.id, onLater)}><ChevronDown aria-hidden />Later</Button> : null}
        {turn ? <AssistantTurnNote {...turn} /> : null}
      </>
    );
  };
  return (
    <div
      role="log"
      aria-label="Conversation"
      tabIndex={0}
      className={cn(focusRing, "min-h-0 touch-pan-y overflow-y-auto px-5 pt-2 pb-3.5 select-text focus-visible:-outline-offset-focus", className)}
      onScroll={(event) => {
        const viewport = event.currentTarget;
        if (visible && status === "loaded") scroll.current.follows = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 80;
        onScroll?.(event);
      }}
      {...props}
    >
      <div ref={placed} className="flex min-h-full flex-col gap-5">
        {onReturnToOriginal ? <Button variant="ghost" size="sm" className="self-start" onClick={onReturnToOriginal}><ArrowLeft aria-hidden />Original chat</Button> : null}
        {body()}
      </div>
    </div>
  );
}
