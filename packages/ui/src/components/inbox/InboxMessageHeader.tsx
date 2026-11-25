import { ChevronDown } from "lucide-react";
import { Avatar } from "../Avatar.tsx";
import { focusRing } from "../../lib/cn.ts";

export type InboxMessageHeaderProps = {
  /** Who sent it, as the sender wrote the name. */
  sender: string;
  /** The sender's address. */
  address: string;
  /** Who it was sent to, as one line. */
  to: string;
  /** Who was copied, as one line; the line is left out without it. */
  cc?: string;
  /** Where replies are asked to go, when that is not the sender; shown so a reply is never a surprise. */
  replyTo?: string;
  /** When it was sent, already worded. */
  date: string;
};

/**
 * Who a message is from, to and copied, where replies go, and when.
 *
 * @model spec/app/inbox/message.md
 */
export function InboxMessageHeader({ sender, address, to, cc, replyTo, date }: InboxMessageHeaderProps) {
  return (
    <div className="flex items-start gap-3">
      <Avatar name={sender} className="size-11 shrink-0" />
      <details className="group min-w-0 flex-1">
        <summary aria-label="Show message details" className={`${focusRing} flex min-h-11 cursor-pointer list-none flex-col justify-center rounded-sm`}>
          <span className="flex min-w-0 items-center gap-2 text-body leading-tight font-semibold">
            <span className="truncate">{sender || "Unknown sender"}</span>
            <ChevronDown aria-hidden className="size-3.5 shrink-0 text-muted-foreground group-open:rotate-180" />
          </span>
          <span className="mt-0.5 truncate text-meta text-muted-foreground">{to ? `To ${to}` : "Undisclosed recipients"}{date ? ` · ${date}` : ""}</span>
        </summary>
        <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-meta leading-snug [overflow-wrap:anywhere]">
          <dt className="text-muted-foreground">From</dt>
          <dd>{address && address !== sender ? `${sender} <${address}>` : sender || "Unknown sender"}</dd>
          <dt className="text-muted-foreground">To</dt>
          <dd>{to || "Undisclosed recipients"}</dd>
          {cc ? <><dt className="text-muted-foreground">Cc</dt><dd>{cc}</dd></> : null}
          {replyTo ? <><dt className="text-muted-foreground">Reply-To</dt><dd>{replyTo}</dd></> : null}
          <dt className="text-muted-foreground">Date</dt>
          <dd>{date}</dd>
        </dl>
      </details>
    </div>
  );
}
