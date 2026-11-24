import { type PointerEvent, useRef } from "react";
import { Check, Paperclip } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Avatar } from "../Avatar.tsx";

export type InboxMessageRowProps = {
  /** Who it is from, as the sender wrote the name. */
  sender: string;
  /** The subject line. */
  subject: string;
  /** The first words of the body, in quieter type. */
  snippet: string;
  /** When it arrived, already worded for the list: a time today, else a date. */
  time: string;
  /** Not yet read: the sender is bold and a dot marks it. */
  unread?: boolean;
  /** Carries at least one attachment. */
  attachment?: boolean;
  /** Is among the messages chosen for archiving or Trash. */
  chosen?: boolean;
  /** Opens the message. */
  onOpen?: () => void;
  /** Chooses or unchooses the message; offered only on a list read afresh, so a saved list leaves it out and the avatar is only a picture. */
  onChosenChange?: (chosen: boolean) => void;
  /** Called by a swipe sideways, which chooses the message alone to be archived; offered only where choosing is. */
  onSwipe?: () => void;
};

const swipeDistance = 72;

/**
 * One message of the list: its sender, subject, first words and time. The avatar, where choosing is offered, chooses
 * the message for archiving or Trash; a swipe sideways chooses it alone.
 *
 * @model spec/app/inbox/index.md
 */
export function InboxMessageRow({ sender, subject, snippet, time, unread = false, attachment = false, chosen = false, onOpen, onChosenChange, onSwipe }: InboxMessageRowProps) {
  const swipeFromRef = useRef<number | undefined>(undefined);
  const start = (event: PointerEvent) => {
    swipeFromRef.current = event.clientX;
  };
  const end = (event: PointerEvent) => {
    if (onSwipe && swipeFromRef.current !== undefined && Math.abs(event.clientX - swipeFromRef.current) >= swipeDistance) onSwipe();
    swipeFromRef.current = undefined;
  };
  const picture = chosen ? (
    <span role="img" aria-label={sender} className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
      <Check aria-hidden className="size-5" />
    </span>
  ) : (
    <Avatar name={sender} />
  );
  return (
    <div onPointerDown={start} onPointerUp={end} onPointerCancel={() => { swipeFromRef.current = undefined; }} className={cn("flex items-center gap-1 pr-2 pl-1 touch-pan-y", chosen && "bg-accent")}>
      {onChosenChange ? (
        <button type="button" aria-pressed={chosen} onClick={() => onChosenChange(!chosen)} className={cn(focusRing, "flex size-12 shrink-0 items-center justify-center rounded-full")}>
          <span className="sr-only">Choose</span>
          {picture}
        </button>
      ) : (
        <span className="flex size-12 shrink-0 items-center justify-center">{picture}</span>
      )}
      <button type="button" onClick={onOpen} className={cn(focusRing, "flex min-h-16 min-w-0 flex-1 flex-col justify-center rounded-lg py-2 pr-1 pl-2 text-left")}>
        <span className="flex items-baseline gap-2">
          <span className={cn("min-w-0 flex-1 truncate text-base", unread ? "font-bold" : "font-medium")}>{sender}</span>
          {attachment ? <Paperclip role="img" aria-label="Has attachment" className="size-4 shrink-0 self-center text-muted-foreground" /> : null}
          <span className="shrink-0 text-xs text-muted-foreground">{time}</span>
        </span>
        <span className={cn("truncate text-sm", unread ? "font-semibold" : "font-normal")}>{subject}</span>
        <span className="truncate text-sm text-muted-foreground">{snippet}</span>
      </button>
      {unread ? <span role="img" aria-label="Unread" className="size-2.5 shrink-0 rounded-full bg-primary" /> : <span className="size-2.5 shrink-0" />}
    </div>
  );
}
