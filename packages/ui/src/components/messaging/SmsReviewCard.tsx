import type { MouseEvent } from "react";
import { cn } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";

export type SmsReviewCardProps = {
  /** Who the text goes to: the number, or the contact's name. */
  to: string;
  /** The number under the contact's name, when `to` is a name. */
  number?: string;
  /** The text exactly as it will be sent. */
  body: string;
  /** A quieter line under the text, such as the SIM it goes from. */
  note?: string;
  /** A quieter line under the buttons, such as what to say in Talk to send it. */
  hint?: string;
  /** The review this card shows, set as `data-alpha-review` so a spoken Send finds this card's Send. */
  review?: string;
  /** Sends this exact text; offered only while the owner may approve it. */
  onSend?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Declines the text; nothing is sent. */
  onDecline?: () => void;
  /** Send is shown but can't be pressed, such as while the decision is being made. */
  sendDisabled?: boolean;
  /** Don’t send is shown but can't be pressed. */
  declineDisabled?: boolean;
  className?: string;
};

/**
 * A text the agent asks to send, for the owner to approve: who it goes to, the text as it will go, and Don’t send
 * beside a black Send. Nothing is sent until the owner presses Send.
 *
 * @model spec/app/contacts/agent.md
 */
export function SmsReviewCard({ to, number, body, note, hint, review, onSend, onDecline, sendDisabled = false, declineDisabled = false, className }: SmsReviewCardProps) {
  return (
    <section aria-label={`Text to ${to}`} data-alpha-sms-review="" data-alpha-review={review}
      className={cn("flex flex-col gap-2 rounded-tile border border-border bg-background px-4.5 pt-4 pb-3.5 text-foreground", className)}>
      <p className="text-lg leading-snug font-bold wrap-anywhere">To {to}</p>
      {number ? <p className="-mt-1.5 text-sm text-muted-foreground">{number}</p> : null}
      <p className="text-lead leading-normal whitespace-pre-wrap wrap-anywhere">{body}</p>
      {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
      {onSend || onDecline ? (
        <div className="flex flex-wrap justify-end gap-2">
          {onDecline ? <Button variant="secondary" className="h-11 px-4.5 font-normal" disabled={declineDisabled} onClick={onDecline}>Don’t send</Button> : null}
          {onSend ? (
            <Button aria-label="Send this text" data-alpha-review-send="" disabled={sendDisabled}
              className="h-11 bg-foreground px-4.5 font-normal text-background hover:bg-foreground/90 active:bg-foreground/80" onClick={onSend}>Send</Button>
          ) : null}
        </div>
      ) : null}
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
    </section>
  );
}
