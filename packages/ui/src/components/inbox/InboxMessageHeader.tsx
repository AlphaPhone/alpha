import { Avatar } from "../Avatar.tsx";

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
      <Avatar name={sender} />
      <dl className="grid min-w-0 flex-1 grid-cols-[auto_1fr] gap-x-3 text-sm">
        <dt className="sr-only">From</dt>
        <dd className="col-span-2 flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-base font-semibold">{sender}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{date}</span>
        </dd>
        <dt className="sr-only">Address</dt>
        <dd className="col-span-2 truncate text-muted-foreground">{address}</dd>
        <dt className="text-muted-foreground">To</dt>
        <dd className="min-w-0 break-words">{to}</dd>
        {cc ? (
          <>
            <dt className="text-muted-foreground">Cc</dt>
            <dd className="min-w-0 break-words">{cc}</dd>
          </>
        ) : null}
        {replyTo ? (
          <>
            <dt className="text-muted-foreground">Reply-To</dt>
            <dd className="min-w-0 break-words">{replyTo}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}
