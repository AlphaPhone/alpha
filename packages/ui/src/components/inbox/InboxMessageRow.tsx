import { type MouseEvent, type PointerEvent, useRef } from "react";
import { Archive, Check, Paperclip } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

export type InboxMessageRowProps = {
  /** Who it is from, as the sender wrote the name. */
  sender: string;
  /** The one letter on the round avatar; the sender's first letter when left out. */
  initial?: string;
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
  /** The message open beside this list. */
  current?: boolean;
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
 * One message of the list: its sender, subject, first words and time, over the archive mark a left swipe reveals.
 * Pressing the row opens it or chooses it in selection mode; a left swipe chooses it alone for archive review.
 *
 * @model spec/app/inbox/index.md
 */
export function InboxMessageRow({ sender, initial, subject, snippet, time, unread = false, attachment = false, chosen = false, current = false, selecting = false, onOpen, onChosenChange, onSwipe }: InboxMessageRowProps) {
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
    const suppressed = suppressClickRef.current;
    suppressClickRef.current = false;
    if (suppressed && event.detail !== 0) return;
    if (selecting) onChosenChange?.(!chosen);
    else onOpen?.();
  };
  return (
    <div className="relative touch-pan-y overflow-hidden">
      <span aria-hidden className="absolute inset-0 flex items-center justify-end bg-secondary px-6 text-muted-foreground"><Archive className="size-5.5" /></span>
      <button type="button" role={selecting ? "checkbox" : undefined} aria-checked={selecting ? chosen : undefined} aria-current={current || undefined}
        disabled={selecting ? !onChosenChange : !onOpen} onClick={activate}
        onPointerDown={start} onPointerUp={end} onPointerCancel={() => { swipeFromRef.current = undefined; }} onLostPointerCapture={() => { swipeFromRef.current = undefined; }}
        className={cn(focusRing, "relative flex w-full touch-pan-y items-start gap-3.5 bg-background px-5 py-3.25 text-left focus-visible:-outline-offset-focus disabled:opacity-50", current && "bg-secondary")}
      >
        {unread ? <span className="sr-only">Unread</span> : null}
        {selecting ? (
          <span aria-hidden className={cn("mt-2 grid size-6 flex-none place-items-center rounded-box border text-background", chosen ? "border-foreground bg-foreground" : "border-muted-foreground")}>
            {chosen ? <Check className="size-4" /> : null}
          </span>
        ) : null}
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">{initial ?? Array.from(sender.trim())[0]?.toUpperCase()}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-h-4.25 items-center gap-1.5 leading-tight">
            <span className={cn("min-w-0 truncate text-base leading-tight", unread ? "font-bold" : "font-medium")}>{sender}</span>
            <span className="flex-1" />
            {attachment ? <Paperclip aria-hidden className="size-3.5 shrink-0 text-muted-foreground" /> : null}
            <span className="shrink-0 text-xs leading-tight whitespace-nowrap text-muted-foreground">{time}</span>
          </span>
          <span className="mt-0.5 flex min-h-4.25 items-center gap-2 leading-tight">
            <span data-inbox-subject="" className={cn("min-w-0 flex-1 truncate text-subject leading-tight", unread && "font-semibold")}>{subject}</span>
            <span aria-hidden className={cn("size-2 shrink-0 rounded-full", unread && "bg-primary")} />
          </span>
          <span className="mt-0.5 block min-h-4 truncate text-snippet leading-tight text-muted-foreground">{snippet}</span>
        </span>
        {attachment ? <span className="sr-only">Has attachments</span> : null}
      </button>
    </div>
  );
}
