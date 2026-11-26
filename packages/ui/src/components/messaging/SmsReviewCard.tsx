import type { MouseEvent } from "react";
import { cn } from "../../lib/cn.ts";

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
 * A text the agent asks to send, for the owner to approve, as the Pixel drew it on Sunday's v119 (Alpha 45f6bed30): one
 * grey review with two rows. The first says Review SMS, who it goes to, the text as it will go in its own white box and
 * the quieter note, with a blue Send at its end; the second is "Keep things as they are." with a grey Decline
 * (`prototype/template.html:4577-4590`; `prototype/agent-adapter.ts:493-496,1992-1994`;
 * `ui/device-actions/client-coordinator.ts:3559-3568`; `prototype/phone.css:926-930,943-946,956`). Send is filled Alpha blue in both themes: v119 fills it with `--acc`, #0000FF, which has no dark value (`prototype/prototype.css:3`).
 * Nothing is sent until the owner presses Send.
 *
 * @model spec/app/contacts/agent.md
 */
export function SmsReviewCard({ to, number, body, note, hint, review, onSend, onDecline, sendDisabled = false, declineDisabled = false, className }: SmsReviewCardProps) {
  const row = "flex min-h-14 w-full items-center gap-3 border-b border-border px-4 py-3 text-left disabled:cursor-default disabled:opacity-50";
  const label = "inline-flex min-h-9 shrink-0 items-center rounded-action px-4 text-sm font-semibold";
  const details = (
    <div className="min-w-0 grow">
      <div className="text-sm font-semibold">Review SMS</div>
      <small className="mt-1 block text-meta text-muted-foreground wrap-anywhere">To: {to}{number ? (number.startsWith("(") ? ` ${number}` : ` (${number})`) : ""}</small>
      <span data-alpha-telephony-review-body="" className="my-1.5 block rounded-sm bg-background px-3 py-2.5 text-lg leading-details font-medium whitespace-pre-wrap text-foreground wrap-anywhere ring-1 ring-border ring-inset">{body}</span>
      {note ? <small className="block text-meta text-muted-foreground wrap-anywhere">{note}</small> : null}
      {hint ? <small className="block text-meta">{hint}</small> : null}
    </div>
  );
  return (
    <section aria-label={`Text to ${to}`} data-alpha-sms-review="" data-alpha-review={review}
      className={cn("overflow-hidden rounded-tile bg-secondary text-foreground", className)}>
      {onSend ? (
        <button type="button" aria-label="Send this text" data-alpha-review-send="" disabled={sendDisabled} className={row} onClick={onSend}>
          {details}
          <strong className={cn(label, "bg-alpha text-alpha-foreground")}>Send</strong>
        </button>
      ) : <div className={row}>{details}</div>}
      {onDecline ? (
        <button type="button" aria-label="Decline Keep things as they are." disabled={declineDisabled} className={row} onClick={onDecline}>
          <div className="min-w-0 grow text-meta leading-details text-muted-foreground">Keep things as they are.</div>
          <strong className={cn(label, "bg-accent text-foreground")}>Decline</strong>
        </button>
      ) : null}
    </section>
  );
}
