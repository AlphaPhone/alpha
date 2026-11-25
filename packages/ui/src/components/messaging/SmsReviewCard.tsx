import { cn } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";

export type SmsReviewCardProps = {
  /** Who the text goes to: the number, or the contact's name. */
  to: string;
  /** The number under the contact's name, when `to` is a name. */
  number?: string;
  /** The text exactly as it will be sent. */
  body: string;
  /** What happens after Send, such as Android asking to confirm, in quieter type. */
  note?: string;
  /** Sends this exact text; offered only while the owner may approve it. */
  onSend?: () => void;
  /** Declines the text; nothing is sent. */
  onDecline?: () => void;
  className?: string;
};

/**
 * A text the agent asks to send, for the owner to approve: who it goes to, the text as it will go, and Don’t send
 * beside a black Send. Nothing is sent until the owner presses Send.
 *
 * @model spec/app/contacts/agent.md
 */
export function SmsReviewCard({ to, number, body, note, onSend, onDecline, className }: SmsReviewCardProps) {
  return (
    <section aria-label={`Text to ${to}`} data-alpha-sms-review="" className={cn("flex flex-col gap-2 rounded-[1.375rem] border border-border bg-background px-4.5 pt-4 pb-3.5 text-foreground", className)}>
      <p className="text-lg leading-snug font-bold tabular-nums wrap-anywhere">To {to}</p>
      {number ? <p className="-mt-1.5 text-sm text-muted-foreground tabular-nums">{number}</p> : null}
      <p className="text-lead leading-normal whitespace-pre-wrap wrap-anywhere">{body}</p>
      {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
      {onSend || onDecline ? (
        <div className="flex flex-wrap justify-end gap-2">
          {onDecline ? <Button variant="secondary" className="h-11 px-4.5 font-normal" onClick={onDecline}>Don’t send</Button> : null}
          {onSend ? <Button aria-label="Send this text" data-alpha-review-send="" className="h-11 bg-foreground px-4.5 font-normal text-background hover:bg-foreground/90 active:bg-foreground/80" onClick={onSend}>Send</Button> : null}
        </div>
      ) : null}
    </section>
  );
}
