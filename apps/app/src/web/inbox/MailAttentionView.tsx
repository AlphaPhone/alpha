// spec/inbox/mailbox.md, "Home learns only the unread count of the loaded inbox and whether more mail is beyond it"
import { Mail } from "lucide-react";
import type { InboxAttention } from "../../../gen/inbox__mailbox.ts";
import { Button } from "../components/ui/index.ts";

/** What Home may learn of the loaded inbox, and how it opens the Inbox. */
export interface MailAttentionViewProps {
  /** The unread count of the loaded inbox and whether more mail is beyond it. */
  attention: InboxAttention;
  /** Open the Inbox. */
  onOpen: () => void;
}

/** Home's word about waiting mail: the unread count only, opening the Inbox. */
export function MailAttentionView({ attention, onOpen }: MailAttentionViewProps) {
  if (attention.phase !== "AttentionReady" || attention.unread === 0) return null;
  return (
    <Button variant="secondary" aria-label={`Open Inbox: ${attention.unread}${attention.more ? "+" : ""} unread emails`} onClick={onOpen}>
      <Mail aria-hidden />{attention.unread}{attention.more ? "+" : ""}
    </Button>
  );
}
