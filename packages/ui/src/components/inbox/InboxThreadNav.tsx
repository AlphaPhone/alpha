import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "../Button.tsx";

export type InboxThreadNavProps = {
  /** Where the message stands in its thread, counted from 1 at the oldest. */
  place: number;
  /** How many messages the thread has. */
  count: number;
  /** Shows the previous, older message; offered only after the first and while its account may be read. */
  onOlder?: () => void;
  /** Shows the next, newer message; offered only before the last and while its account may be read. */
  onNewer?: () => void;
};

/**
 * Moves one place through the thread of the message open, with the place as a number of the total.
 *
 * @model spec/app/inbox/message.md
 */
export function InboxThreadNav({ place, count, onOlder, onNewer }: InboxThreadNavProps) {
  return (
    <nav aria-label="Thread" className="flex items-center">
      <Button variant="ghost" size="icon" aria-label="Previous message" disabled={!onOlder} onClick={onOlder}><ChevronUp /></Button>
      <span className="min-w-10 text-center text-sm text-muted-foreground tabular-nums"><span className="sr-only">Message </span>{place}/{count}</span>
      <Button variant="ghost" size="icon" aria-label="Next message" disabled={!onNewer} onClick={onNewer}><ChevronDown /></Button>
    </nav>
  );
}
