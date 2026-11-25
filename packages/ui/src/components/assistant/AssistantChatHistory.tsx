import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Banner } from "../Banner.tsx";
import { Button } from "../Button.tsx";
import { EmptyState } from "../EmptyState.tsx";
import { ListGroup } from "../ListGroup.tsx";
import { ListRow } from "../ListRow.tsx";
import { Skeleton } from "../Skeleton.tsx";

export type AssistantChatSummary = {
  /** The agent's number for the conversation, as text. */
  id: string;
  /** Its name. */
  title: string;
  /** When it was last used, or how it began. */
  detail?: string;
  /** It is the conversation showing. */
  current?: boolean;
};

export type AssistantChatHistoryProps = Omit<ComponentProps<"div">, "children"> & {
  /** The conversations the agent listed, newest first. */
  chats: AssistantChatSummary[];
  /** The list is being read, was read, or could not be; a failed list keeps what was listed before. */
  status?: "loading" | "loaded" | "failed";
  /** A turn is in flight or the composer holds something: another conversation cannot be chosen until it is sent or removed. */
  blocked?: boolean;
  /** Nobody knows whether the last new conversation was made: the list is read again before another is asked for. */
  unsure?: boolean;
  /** Shows another conversation; offered only for a listed one that is not showing. */
  onChoose?: (id: string) => void;
  /** Goes back to the conversation showing without choosing another. */
  onBack?: () => void;
  /** Reads the list again. */
  onRetry?: () => void;
};

/**
 * The owner's conversations with Ask Alpha, inside the sheet in place of the messages, each under its own name: choose
 * one to open it where it was left. Its states are loading, empty, failed, and blocked while a turn or a draft is in
 * the way; a new conversation is started from the composer's `+` menu.
 * @model spec/app/assistant/chats.md
 */
export function AssistantChatHistory({ chats, status = "loaded", blocked = false, unsure = false, onChoose, onBack, onRetry, className, ...props }: AssistantChatHistoryProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)} {...props}>
      {onBack ? <Button variant="ghost" size="sm" className="self-start" onClick={onBack}><ArrowLeft aria-hidden />Back to chat</Button> : null}
      {blocked ? <Banner variant="info">Send or remove what you are writing, and wait for the reply, to switch chats</Banner> : null}
      {unsure ? <Banner variant="warn">Checking whether your last chat was made</Banner> : null}
      {status === "failed" ? <Banner variant="warn" action={onRetry ? <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button> : null}>Chats did not load</Banner> : null}
      {status === "loading" && !chats.length ? (
        <div aria-busy className="flex flex-col gap-2"><Skeleton className="h-13" /><Skeleton className="h-13" /><Skeleton className="h-13" /></div>
      ) : !chats.length && status === "loaded" ? (
        <EmptyState icon={<MessageSquare />} title="No chats yet" />
      ) : chats.length ? (
        <ListGroup surface="plain" aria-label="Chats">
          {chats.map((chat) => (
            <ListRow key={chat.id} title={chat.title} detail={chat.detail} selected={chat.current} disabled={blocked && !chat.current} onClick={onChoose && !chat.current ? () => onChoose(chat.id) : undefined} />
          ))}
        </ListGroup>
      ) : null}
    </div>
  );
}
