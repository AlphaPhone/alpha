import { RotateCw } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

const faults = {
  unreachable: { title: "Message could not be read", action: "Retry" },
  changed: { title: "This message changed in Gmail", action: "Retry" },
  conversationChanged: { title: "This conversation changed", action: "Reopen" },
  tooLarge: { title: "Too large to show here", action: "Open in Gmail" },
} as const;

export type InboxMessageFaultKind = keyof typeof faults;

export type InboxMessageFaultProps = {
  /** Why the message is not shown: Gmail could not be reached, the message or its conversation changed, or it is too large or has too many parts. */
  kind: InboxMessageFaultKind;
  /** Does what the fault allows: reads it again, reopens the conversation at its newest message, or opens it in Gmail. */
  onAction?: () => void;
};

/**
 * Stands where the body of a message would be when it could not be read, with the one way on.
 *
 * @model spec/app/inbox/message.md
 */
export function InboxMessageFault({ kind, onAction }: InboxMessageFaultProps) {
  const { title, action } = faults[kind];
  return (
    <>
      <p role="status" className="mt-5.5 text-body whitespace-pre-wrap">{title}</p>
      {onAction ? (
        <button type="button" onClick={onAction} className={cn(focusRing, "inline-flex min-h-11 items-center gap-1.5 rounded-sm text-primary")}><RotateCw aria-hidden className="size-4" />{action}</button>
      ) : null}
    </>
  );
}
