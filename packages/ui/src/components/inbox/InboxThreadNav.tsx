import { ChevronDown, ChevronUp } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

export type InboxThreadNavProps = {
  /** Where the message stands in its thread, counted from 1 at the oldest. */
  place: number;
  /** How many messages the thread has. */
  count: number;
  /** The other messages on the conversation page. Left out until preview data is known. */
  threadRows?: readonly InboxThreadRow[];
  /** Opens the earlier page when previews are available, or the previous message while they are unknown. */
  onOlder?: () => void;
  /** Opens the later page when previews are available, or the next message while they are unknown. */
  onNewer?: () => void;
};

export type InboxThreadRow = {
  /** The message's zero-based position in the provider's conversation. */
  position: number;
  /** Who sent the message. */
  sender: string;
  /** When it was sent, shown as a time today or a date. */
  date: string;
  /** The message preview, displayed as plain text. */
  snippet: string;
  /** Opens this message while the current account and conversation still allow it. */
  onOpen?: () => void;
};

const page = cn(focusRing, "flex min-h-11 items-center gap-1.5 rounded-sm text-primary [&_svg]:size-4");

/**
 * The conversation around the message open, with a preview for each sibling on the page and Earlier or More when another page is available.
 *
 * @model spec/app/inbox/message.md
 */
export function InboxThreadNav({ place, count, threadRows, onOlder, onNewer }: InboxThreadNavProps) {
  if (!threadRows?.length && (count <= 1 || (!onOlder && !onNewer))) return null;
  return (
    <div role="group" aria-label={threadRows ? "Conversation" : `Message ${place} of ${count}`} className="mb-5 flex flex-col items-start">
      {onOlder ? <button type="button" aria-label="Earlier messages" onClick={onOlder} className={page}><ChevronUp aria-hidden />Earlier</button> : null}
      {threadRows?.map(({ position, sender, date, snippet, onOpen }) => (
        <button key={position} type="button" disabled={!onOpen} onClick={onOpen}
          className={cn(focusRing, "flex min-h-11 w-full min-w-0 flex-col gap-1.25 border-b border-border py-3.5 text-left focus-visible:-outline-offset-focus disabled:opacity-50")}
        >
          <span className="flex w-full min-w-0 items-baseline justify-between gap-3">
            <strong className="min-w-0 truncate text-sm">{sender || "Unknown sender"}</strong>
            <small className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">{date}</small>
          </span>
          <span className="w-full truncate text-sm text-muted-foreground">{snippet}</span>
        </button>
      ))}
      {onNewer ? <button type="button" aria-label="More messages" onClick={onNewer} className={page}><ChevronDown aria-hidden />More</button> : null}
    </div>
  );
}
