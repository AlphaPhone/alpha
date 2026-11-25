import { ChevronDown } from "lucide-react";
import { focusRing } from "../../lib/cn.ts";

export type InboxMessageHeaderProps = {
  /** Who sent it, as the sender wrote the name. */
  sender: string;
  /** The sender's address; without it the details say "Unknown sender". */
  address: string;
  /** Who it was sent to, as one line. */
  to: string;
  /** Who was copied, as one line; the line is left out without it. */
  cc?: string;
  /** Where replies are asked to go, when that is not the sender; shown so a reply is never a surprise. */
  replyTo?: string;
  /** When it was sent, as the list words it: a time today, else a date. */
  date: string;
  /** When it was sent in full, with the weekday, seconds and time zone, for the details; `date` when left out. */
  fullDate?: string;
};

/**
 * Who a message is from, to and copied, where replies go, and when.
 *
 * @model spec/app/inbox/message.md
 */
export function InboxMessageHeader({ sender, address, to, cc, replyTo, date, fullDate }: InboxMessageHeaderProps) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">{Array.from(sender.trim())[0]?.toUpperCase()}</span>
      <details className="group min-w-0 flex-1 [overflow-wrap:anywhere]">
        <summary aria-description="Show message details" className={`${focusRing} block min-h-11 cursor-pointer list-none rounded-sm [&::-webkit-details-marker]:hidden`}>
          <span className="text-md font-semibold">{sender || "Unknown sender"}</span>
          <ChevronDown aria-hidden className="ms-2 inline-block size-3.5 align-middle text-muted-foreground group-open:rotate-180" />
          <span className="mt-0.5 block text-meta leading-plain text-muted-foreground">{to ? `To ${to}` : "Undisclosed recipients"}{date ? ` · ${date}` : ""}</span>
        </summary>
        <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-meta leading-details">
          <dt className="text-muted-foreground">From</dt>
          <dd className="min-w-0 select-text">{address ? (address !== sender ? `${sender} <${address}>` : address) : "Unknown sender"}</dd>
          <dt className="text-muted-foreground">To</dt>
          <dd className="min-w-0 select-text">{to || "Undisclosed recipients"}</dd>
          {cc ? <><dt className="text-muted-foreground">Cc</dt><dd className="min-w-0 select-text">{cc}</dd></> : null}
          {replyTo ? <><dt className="text-muted-foreground">Reply-to</dt><dd className="min-w-0 select-text">{replyTo}</dd></> : null}
          <dt className="text-muted-foreground">Date</dt>
          <dd className="min-w-0 select-text">{fullDate ?? date}</dd>
        </dl>
      </details>
    </div>
  );
}
