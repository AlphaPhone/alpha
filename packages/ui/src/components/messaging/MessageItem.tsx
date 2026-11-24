import type { ComponentProps, ReactNode } from "react";
import { AlertCircle, Check, CheckCheck, CornerUpLeft, MessageSquare, Pencil, SmilePlus, Trash2 } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Avatar } from "../Avatar.tsx";
import { Button } from "../Button.tsx";
import { Spinner } from "../Spinner.tsx";

/** Delivery state of an outgoing message. */
export type MessageDeliveryStatus = "sending" | "sent" | "read" | "failed";

/** Inline reference to the message being replied to. */
export type MessageReplyQuote = {
  /** Display name of the quoted author. */
  sender: string;
  /** Short excerpt of the quoted message. */
  excerpt: string;
  /** Jumps to the quoted message in the timeline when pressed. */
  onJump?: () => void;
};

/** Thread reply summary displayed beneath a parent message. */
export type MessageThreadSummary = {
  /** Number of replies in the thread. */
  replyCount: number;
  /** Formatted timestamp of the latest reply, when available. */
  lastReplyTime?: string;
  /** Opens the thread drawer or pane. */
  onOpen: () => void;
};

export type MessageItemProps = Omit<ComponentProps<"article">, "children"> & {
  /** Visual layout: Telegram-style chat bubble or Slack-style author-grouped row. */
  layout: "bubble" | "compact";
  /** Display name of the author. */
  sender: string;
  /** Optional author avatar URL. */
  avatarSrc?: string;
  /** Hides repeated sender identity for consecutive messages by the same author. */
  grouped?: boolean;
  /** Message was sent by the current user. */
  own?: boolean;
  /** Formatted timestamp of the message. */
  time: string;
  /** Message body text. */
  body: string;
  /** Optional quoted reply reference shown above the body. */
  replyTo?: MessageReplyQuote;
  /** Marks the message as edited after sending. */
  edited?: boolean;
  /** Delivery status for outgoing messages. */
  status?: MessageDeliveryStatus;
  /** Optional short failure explanation when `status` is `"failed"`. */
  errorText?: string;
  /** Retries sending a failed message; offered only when `status` is `"failed"`. */
  onRetry?: () => void;
  /** Discards a failed message; offered only when `status` is `"failed"`. */
  onDiscard?: () => void;
  /** Optional Slack thread summary footer with reply count and open action. */
  thread?: MessageThreadSummary;
  /** Starts an inline reply or thread reply to this message. */
  onReply?: () => void;
  /** Opens edit mode for this message. */
  onEdit?: () => void;
  /** Requests deletion of this message. */
  onDelete?: () => void;
  /** Opens quick reaction selection for this message. */
  onReact?: () => void;
  /** Slot for a `ReactionBar` below the message body. */
  reactions?: ReactNode;
};

function DeliveryMark({ status }: { status?: MessageDeliveryStatus }) {
  if (!status) return null;
  if (status === "sending") return <Spinner size="sm" role="status" aria-label="Sending" className="size-3.5 text-muted-foreground" />;
  if (status === "sent") return <Check role="img" aria-label="Sent" className="size-3.5 shrink-0 text-muted-foreground" />;
  if (status === "read") return <CheckCheck role="img" aria-label="Read" className="size-3.5 shrink-0 text-primary" />;
  return <AlertCircle role="img" aria-label="Failed to send" className="size-3.5 shrink-0 text-destructive" />;
}

function ReplyQuote({ replyTo }: { replyTo: MessageReplyQuote }) {
  const inner = (
    <>
      <span className="truncate text-xs font-semibold text-foreground">{replyTo.sender}</span>
      <span className="line-clamp-2 text-xs text-muted-foreground">{replyTo.excerpt}</span>
    </>
  );
  const base = "flex max-w-full flex-col gap-0.5 rounded-sm border-l-2 border-primary bg-muted/60 px-2.5 py-1.5 text-left";
  if (replyTo.onJump) {
    return (
      <button type="button" onClick={replyTo.onJump} className={cn(focusRing, base, "transition-colors duration-fast ease-standard hover:bg-accent")}>
        {inner}
      </button>
    );
  }
  return <div className={base}>{inner}</div>;
}

function MessageActions({ onReply, onReact, onEdit, onDelete }: Pick<MessageItemProps, "onReply" | "onReact" | "onEdit" | "onDelete">) {
  const items = [
    onReply ? { label: "Reply", icon: <CornerUpLeft aria-hidden className="size-4" />, onClick: onReply } : null,
    onReact ? { label: "React", icon: <SmilePlus aria-hidden className="size-4" />, onClick: onReact } : null,
    onEdit ? { label: "Edit", icon: <Pencil aria-hidden className="size-4" />, onClick: onEdit } : null,
    onDelete ? { label: "Delete", icon: <Trash2 aria-hidden className="size-4" />, onClick: onDelete } : null,
  ].filter((item) => item !== null);
  if (items.length === 0) return null;
  return (
    <div className="flex items-center gap-0.5">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          aria-label={item.label}
          onClick={item.onClick}
          className={cn(
            focusRing,
            "relative inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors duration-fast ease-standard hover:bg-accent hover:text-foreground before:absolute before:-inset-1",
          )}
        >
          {item.icon}
        </button>
      ))}
    </div>
  );
}

function FailureBar({ errorText, onRetry, onDiscard }: Pick<MessageItemProps, "errorText" | "onRetry" | "onDiscard">) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <span className="text-xs font-medium text-destructive">{errorText ?? "Not sent"}</span>
      {onRetry ? <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button> : null}
      {onDiscard ? <Button variant="ghost" size="sm" onClick={onDiscard}>Discard</Button> : null}
    </div>
  );
}

function ThreadFooter({ thread }: { thread: MessageThreadSummary }) {
  const countLabel = thread.replyCount === 1 ? "1 reply" : `${thread.replyCount} replies`;
  return (
    <button
      type="button"
      onClick={thread.onOpen}
      className={cn(
        focusRing,
        "inline-flex min-h-9 w-fit items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium text-primary transition-colors duration-fast ease-standard hover:bg-accent",
      )}
    >
      <MessageSquare aria-hidden className="size-3.5 shrink-0" />
      <span>{countLabel}</span>
      {thread.lastReplyTime ? <span className="font-normal text-muted-foreground">{thread.lastReplyTime}</span> : null}
    </button>
  );
}

/**
 * One timeline message supporting Telegram-style bubbles and Slack-style author-grouped compact rows, with inline
 * reply quotes, edited and delivery markers, failed retry/discard actions, thread summaries, quick actions and reactions.
 */
export function MessageItem({
  layout,
  sender,
  avatarSrc,
  grouped = false,
  own = false,
  time,
  body,
  replyTo,
  edited = false,
  status,
  errorText,
  onRetry,
  onDiscard,
  thread,
  onReply,
  onEdit,
  onDelete,
  onReact,
  reactions,
  className,
  ...props
}: MessageItemProps) {
  const failed = status === "failed";
  const meta = (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      {edited ? <span>edited</span> : null}
      <span>{time}</span>
      <DeliveryMark status={status} />
    </span>
  );
  const actions = <MessageActions onReply={onReply} onReact={onReact} onEdit={onEdit} onDelete={onDelete} />;
  if (layout === "compact") {
    return (
      <article aria-label={`${sender} at ${time}`} className={cn("flex items-start gap-3 px-4 py-1.5 text-foreground", className)} {...props}>
        {grouped ? <span aria-hidden className="w-8 shrink-0" /> : <Avatar size="sm" name={sender} src={avatarSrc} className="mt-0.5" />}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {!grouped ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-baseline gap-2">
                <span className="truncate text-sm font-semibold">{sender}</span>
                {meta}
              </div>
              {actions}
            </div>
          ) : null}
          {replyTo ? <ReplyQuote replyTo={replyTo} /> : null}
          <div className="flex items-start justify-between gap-2">
            <p className={cn("min-w-0 flex-1 text-base break-words whitespace-pre-line", failed && "rounded-md border border-destructive px-2.5 py-1.5")}>{body}</p>
            {grouped ? (
              <div className="flex shrink-0 items-center gap-1">
                {meta}
                {actions}
              </div>
            ) : null}
          </div>
          {failed ? <FailureBar errorText={errorText} onRetry={onRetry} onDiscard={onDiscard} /> : null}
          {reactions}
          {thread ? <ThreadFooter thread={thread} /> : null}
        </div>
      </article>
    );
  }
  return (
    <article aria-label={`${own ? "You" : sender} at ${time}`} className={cn("flex flex-col gap-1.5 px-3 py-1", own ? "items-end pl-10" : "items-start pr-10", className)} {...props}>
      <div className={cn("flex max-w-full items-end gap-2", own && "flex-row-reverse")}>
        {!own && !grouped ? <Avatar size="sm" name={sender} src={avatarSrc} /> : !own ? <span aria-hidden className="w-8 shrink-0" /> : null}
        <div className={cn("flex min-w-0 flex-col gap-1.5 rounded-tile px-3.5 py-2.5", own ? "bg-secondary text-secondary-foreground" : "border border-border bg-card text-card-foreground", failed && "border border-destructive")}>
          {!own && !grouped ? <span className="text-xs font-semibold text-primary">{sender}</span> : null}
          {replyTo ? <ReplyQuote replyTo={replyTo} /> : null}
          <p className="text-base break-words whitespace-pre-line">{body}</p>
          <div className="flex items-center justify-end gap-2">{meta}</div>
        </div>
      </div>
      {failed ? <FailureBar errorText={errorText} onRetry={onRetry} onDiscard={onDiscard} /> : null}
      {reactions}
      {thread ? <ThreadFooter thread={thread} /> : null}
      {actions}
    </article>
  );
}
