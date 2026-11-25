import type { ComponentProps } from "react";
import { MessageSquare, MessageSquarePlus } from "lucide-react";
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
  /** A new conversation is being made. */
  making?: boolean;
  /** Nobody knows whether the last new conversation was made: the list is read again before another is asked for. */
  unsure?: boolean;
  /** Shows another conversation; offered only for a listed one that is not showing. */
  onChoose?: (id: string) => void;
  /** Starts a new conversation. */
  onStart?: () => void;
  /** Reads the list again. */
  onRetry?: () => void;
};

/**
 * The owner's conversations with Ask Alpha: choose one to open it where it was left, or start a new one. Its states
 * are loading, empty, failed, blocked while a turn or a draft is in the way, and a new conversation being made.
 * @model spec/app/assistant/chats.md
 */
export function AssistantChatHistory({ chats, status = "loaded", blocked = false, making = false, unsure = false, onChoose, onStart, onRetry, ...props }: AssistantChatHistoryProps) {
  const start = <Button loading={making} disabled={!onStart || unsure} onClick={onStart}><MessageSquarePlus aria-hidden />New chat</Button>;
  return (
    <div className="flex flex-col gap-3" {...props}>
      {blocked ? <Banner variant="info">Send or remove what you are writing, and wait for the reply, to switch chats</Banner> : null}
      {unsure ? <Banner variant="warn">Checking whether your last chat was made</Banner> : null}
      {status === "failed" ? <Banner variant="warn" action={onRetry ? <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button> : null}>Chats did not load</Banner> : null}
      {status === "loading" && !chats.length ? (
        <div aria-busy className="flex flex-col gap-2"><Skeleton className="h-13" /><Skeleton className="h-13" /><Skeleton className="h-13" /></div>
      ) : !chats.length && status === "loaded" ? (
        <EmptyState icon={<MessageSquare />} title="No chats yet">{start}</EmptyState>
      ) : chats.length ? (
        <>
          <ListGroup surface="plain" aria-label="Chats">
            {chats.map((chat) => (
              <ListRow key={chat.id} title={chat.title} detail={chat.detail} selected={chat.current} disabled={blocked && !chat.current} onClick={onChoose && !chat.current ? () => onChoose(chat.id) : undefined} />
            ))}
          </ListGroup>
          {start}
        </>
      ) : null}
    </div>
  );
}
