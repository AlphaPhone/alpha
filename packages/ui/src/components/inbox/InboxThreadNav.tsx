import { ChevronDown, ChevronUp } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

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

const page = cn(focusRing, "flex min-h-11 items-center gap-1.5 rounded-sm text-primary [&_svg]:size-4");

/**
 * Moves one place through the thread of the message open: Earlier above it, More after it, each only where there is one.
 *
 * @model spec/app/inbox/message.md
 */
export function InboxThreadNav({ place, count, onOlder, onNewer }: InboxThreadNavProps) {
  if (count <= 1 || (!onOlder && !onNewer)) return null;
  return (
    <nav aria-label={`Message ${place} of ${count}`} className="mb-5 flex flex-col items-start">
      {onOlder ? <button type="button" aria-label="Earlier messages" onClick={onOlder} className={page}><ChevronUp aria-hidden />Earlier</button> : null}
      {onNewer ? <button type="button" aria-label="More messages" onClick={onNewer} className={page}><ChevronDown aria-hidden />More</button> : null}
    </nav>
  );
}
