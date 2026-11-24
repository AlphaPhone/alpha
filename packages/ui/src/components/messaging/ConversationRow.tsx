import type { ComponentProps } from "react";
import { BellOff, Hash, Lock, Pin } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Avatar } from "../Avatar.tsx";
import { StatusDot } from "../StatusDot.tsx";

/** Visual identity at the start of a conversation row: a person or group avatar, or a public/private channel mark. */
export type ConversationKind = "direct" | "group" | "channel-public" | "channel-private";

export type ConversationRowProps = Omit<ComponentProps<"button">, "title" | "onSelect" | "children"> & {
  /** Conversation, contact or channel name. */
  title: string;
  /** Whether the row represents a direct chat, group, public channel or private channel. */
  kind?: ConversationKind;
  /** Picture URL for direct or group chats; initials stand in when omitted. */
  avatarSrc?: string;
  /** Shows an online presence dot on direct or group avatars. */
  online?: boolean;
  /** Formatted timestamp of the latest activity. */
  time?: string;
  /** Latest message excerpt. */
  preview?: string;
  /** Optional sender prefix before the preview in group chats or channels. */
  previewSender?: string;
  /** Active typing status that temporarily replaces the message preview. */
  typing?: string;
  /** Conversation notifications are muted. */
  muted?: boolean;
  /** Conversation is pinned near the top of the list. */
  pinned?: boolean;
  /** Marks the conversation as unread when an exact unread count is unavailable. */
  unread?: boolean;
  /** Number of unread messages in the conversation. */
  unreadCount?: number;
  /** Number of unread `@` mentions in the conversation. */
  mentionCount?: number;
  /** Marks the conversation currently open beside the list. */
  selected?: boolean;
  /** Called when the conversation row is pressed. */
  onSelect?: () => void;
};

const formatCount = (count: number) => (count > 99 ? "99+" : String(count));

/**
 * One conversation in a messaging list: avatar or channel mark with optional presence dot, title, timestamp,
 * preview or typing status, muted and pinned indicators, unread count and distinct `@` mention badge.
 */
export function ConversationRow({
  title,
  kind = "direct",
  avatarSrc,
  online = false,
  time,
  preview,
  previewSender,
  typing,
  muted = false,
  pinned = false,
  unread = false,
  unreadCount = 0,
  mentionCount = 0,
  selected = false,
  onSelect,
  className,
  ...props
}: ConversationRowProps) {
  const hasUnread = unread || unreadCount > 0 || mentionCount > 0;
  const isChannel = kind === "channel-public" || kind === "channel-private";
  return (
    <button
      type="button"
      aria-current={selected || undefined}
      onClick={onSelect}
      className={cn(
        focusRing,
        "flex min-h-16 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-foreground transition-colors duration-fast ease-standard hover:bg-accent/60 focus-visible:-outline-offset-focus active:bg-accent disabled:pointer-events-none disabled:opacity-50",
        selected && "bg-accent",
        className,
      )}
      {...props}
    >
      {isChannel ? (
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          {kind === "channel-private" ? <Lock className="size-4.5" /> : <Hash className="size-4.5" />}
        </span>
      ) : (
        <span className="relative flex shrink-0">
          <Avatar name={title} src={avatarSrc} />
          {online ? (
            <span className="absolute -right-0.5 -bottom-0.5 rounded-full bg-background p-0.5">
              <StatusDot status="ok" label="Online" />
            </span>
          ) : null}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5">
          <span className={cn("min-w-0 flex-1 truncate text-base", hasUnread ? "font-semibold" : "font-medium")}>{title}</span>
          {pinned ? <Pin role="img" aria-label="Pinned" className="size-3.5 shrink-0 text-muted-foreground" /> : null}
          {muted ? <BellOff role="img" aria-label="Muted" className="size-3.5 shrink-0 text-muted-foreground" /> : null}
          {time ? <span className={cn("shrink-0 text-xs", hasUnread && !muted ? "font-medium text-foreground" : "text-muted-foreground")}>{time}</span> : null}
        </span>
        <span className="flex items-center gap-2">
          {typing ? (
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary">{typing}</span>
          ) : (
            <span className={cn("min-w-0 flex-1 truncate text-sm", hasUnread && !muted ? "text-foreground" : "text-muted-foreground")}>
              {previewSender ? <span className="font-medium text-foreground">{previewSender}: </span> : null}
              {preview}
            </span>
          )}
          <span className="flex shrink-0 items-center gap-1.5">
            {mentionCount > 0 ? (
              <span aria-label={`${mentionCount} mentions`} className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                {mentionCount > 1 ? `@${formatCount(mentionCount)}` : "@"}
              </span>
            ) : null}
            {unreadCount > 0 ? (
              <span
                aria-label={`${unreadCount} unread`}
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                  muted ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
                )}
              >
                {formatCount(unreadCount)}
              </span>
            ) : unread && mentionCount === 0 ? (
              <span role="img" aria-label="Unread" className={cn("size-2.5 rounded-full", muted ? "bg-muted-foreground" : "bg-primary")} />
            ) : null}
          </span>
        </span>
      </span>
    </button>
  );
}
