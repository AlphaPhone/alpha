import { type MouseEvent, type PointerEvent, useRef } from "react";
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
  /** The list is in selection mode and pressing the row chooses it. */
  selecting?: boolean;
  /** Opens the message. */
  onOpen?: () => void;
  /** Chooses or unchooses the message while selecting from a list read afresh. */
  onChosenChange?: (chosen: boolean) => void;
  /** Called by a left swipe, which chooses the message alone for archive review. */
  onSwipe?: () => void;
};

const swipeDistance = 72;

/**
 * One message of the list: its sender, subject, first words and time. Pressing the row opens it or chooses it in
 * selection mode; a left swipe chooses it alone for archive review.
 *
 * @model spec/app/inbox/index.md
 */
export function InboxMessageRow({ sender, subject, snippet, time, unread = false, attachment = false, chosen = false, selecting = false, onOpen, onChosenChange, onSwipe }: InboxMessageRowProps) {
  const swipeFromRef = useRef<{ pointer: number; x: number; y: number } | undefined>(undefined);
  const suppressClickRef = useRef(false);
  const start = (event: PointerEvent<HTMLButtonElement>) => {
    suppressClickRef.current = false;
    if (!onSwipe || selecting || !event.isPrimary || event.button !== 0) return;
    swipeFromRef.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const end = (event: PointerEvent<HTMLButtonElement>) => {
    const from = swipeFromRef.current;
    if (from?.pointer !== event.pointerId) return;
    swipeFromRef.current = undefined;
    const left = from.x - event.clientX;
    if (Math.abs(left) >= swipeDistance && Math.abs(left) > Math.abs(from.y - event.clientY)) {
      suppressClickRef.current = true;
      if (left > 0) onSwipe?.();
    }
  };
  const activate = (event: MouseEvent<HTMLButtonElement>) => {
    if (suppressClickRef.current && event.detail !== 0) return;
    if (selecting) onChosenChange?.(!chosen);
    else onOpen?.();
  };
  return (
    <button type="button" role={selecting ? "checkbox" : undefined} aria-checked={selecting ? chosen : undefined}
      aria-label={`${unread ? "Unread, " : ""}${sender}, ${subject}${attachment ? ", has attachments" : ""}`}
      disabled={selecting ? !onChosenChange : !onOpen} onClick={activate}
      onPointerDown={start} onPointerUp={end} onPointerCancel={() => { swipeFromRef.current = undefined; }}
      className={cn(focusRing, "flex w-full touch-pan-y items-start gap-3.5 bg-background px-5 py-3.25 text-left focus-visible:-outline-offset-focus")}
    >
      {selecting ? (
        <span aria-hidden className={cn("mt-2 grid size-5.5 flex-none place-items-center rounded-box border text-background", chosen ? "border-foreground bg-foreground" : "border-muted-foreground")}>
          {chosen ? <Check className="size-4" /> : null}
        </span>
      ) : null}
      <Avatar name={sender} className="size-11 text-sm font-bold" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex h-4.25 items-center gap-1.5 leading-tight">
          <span className={cn("min-w-0 truncate text-base leading-tight", unread ? "font-bold" : "font-medium")}>{sender}</span>
          <span className="flex-1" />
          {attachment ? <Paperclip aria-hidden className="size-3.5 shrink-0 text-muted-foreground" /> : null}
          <span className="shrink-0 text-xs leading-tight whitespace-nowrap text-muted-foreground">{time}</span>
        </span>
        <span className="mt-0.5 flex h-4.25 items-center gap-2 leading-tight">
          <span data-inbox-subject="" className={cn("min-w-0 flex-1 truncate text-subject leading-tight", unread && "font-semibold")}>{subject}</span>
          <span aria-hidden className={cn("size-2 shrink-0 rounded-full", unread && "bg-primary")} />
        </span>
        <span className="mt-0.5 block h-4 truncate text-snippet leading-tight text-muted-foreground">{snippet}</span>
      </span>
    </button>
  );
}
