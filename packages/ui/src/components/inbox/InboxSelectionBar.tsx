import { Archive, Trash2 } from "lucide-react";
import { Button } from "../Button.tsx";

export type InboxSelectionBarProps = {
  /** How many messages are chosen. */
  count: number;
  /** Reviews archiving them; offered only where the grant allows changing the mailbox. */
  onArchive?: () => void;
  /** Reviews moving them to Trash; offered only where the grant allows changing the mailbox. */
  onTrash?: () => void;
};

/**
 * What can be done with the messages chosen in the list: the number, and archiving or Trash, each reviewed before it goes.
 *
 * @model spec/app/inbox/index.md
 */
export function InboxSelectionBar({ count, onArchive, onTrash }: InboxSelectionBarProps) {
  return (
    <div role="toolbar" aria-label="Chosen messages" className="flex items-center gap-1 rounded-full bg-secondary py-1 pr-1 pl-5">
      <span aria-live="polite" className="min-w-0 flex-1 text-base font-semibold">{count}</span>
      {onArchive ? <Button variant="ghost" size="icon" aria-label="Archive" onClick={onArchive}><Archive /></Button> : null}
      {onTrash ? <Button variant="ghost" size="icon" aria-label="Move to Trash" onClick={onTrash}><Trash2 /></Button> : null}
    </div>
  );
}
