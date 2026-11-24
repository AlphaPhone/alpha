import { CircleAlert, FileWarning, MessagesSquare, RefreshCcw } from "lucide-react";
import { Button } from "../Button.tsx";
import { EmptyState } from "../EmptyState.tsx";

const faults = {
  unreachable: { icon: <CircleAlert />, title: "Message could not be read", action: "Try again" },
  changed: { icon: <RefreshCcw />, title: "This message changed in Gmail", action: "Try again" },
  conversationChanged: { icon: <MessagesSquare />, title: "This conversation changed", action: "Reopen" },
  tooLarge: { icon: <FileWarning />, title: "Too large to show here", action: "Open in Gmail" },
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
  const { icon, title, action } = faults[kind];
  return <EmptyState icon={icon} title={title}>{onAction ? <Button onClick={onAction}>{action}</Button> : null}</EmptyState>;
}
