import type { ComponentProps } from "react";
import { Check, X } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

export type CalendarInviteProps = Omit<ComponentProps<"div">, "title"> & {
  /** Who invited the owner, as initials. */
  initials: string;
  /** What the event is. */
  title: string;
  /** When it is, such as "Fri, Nov 27 · 7:00 PM". */
  when: string;
  /** Opens the event. */
  onOpen?: () => void;
  /** Declines; left out where the invitation cannot be declined now. */
  onDecline?: () => void;
  /** Answers Going; left out where the invitation cannot be answered now. */
  onAccept?: () => void;
};

/** An invitation waiting for the owner's answer, over the day: who sent it, the event, and decline or accept. */
export function CalendarInvite({ initials, title, when, onOpen, onDecline, onAccept, className, ...props }: CalendarInviteProps) {
  return (
    <div className={cn("flex items-center gap-1 rounded-chip border border-dashed border-border py-1.5 pr-1.5 pl-2", className)} {...props}>
      <button type="button" aria-label={`Invite: ${title}`} disabled={!onOpen} onClick={onOpen} className={cn(focusRing, "flex min-w-0 grow items-center gap-3 rounded-lg text-left")}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs leading-plain font-bold whitespace-nowrap">{initials}</span>
        <span className="min-w-0">
          <span className="block truncate text-subject leading-plain font-semibold">{title}</span>
          <span className="mt-px block text-fine leading-plain text-muted-foreground">{when}</span>
        </span>
      </button>
      {onDecline ? (
        <button type="button" aria-label="Decline invite" onClick={onDecline} className={cn(focusRing, "inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary active:bg-accent")}>
          <X aria-hidden className="size-4.5" />
        </button>
      ) : null}
      {onAccept ? (
        <button type="button" aria-label="Accept invite" onClick={onAccept} className={cn(focusRing, "inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-alpha text-alpha-foreground")}>
          <Check aria-hidden className="size-4.5" />
        </button>
      ) : null}
    </div>
  );
}
