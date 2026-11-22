// spec/calendar/presentation.md, "Search lists the read window's events; opening it closes the open event and the picker"
import type { CalendarRow } from "../../calendar/model.vibe";
import { EmptyState, ListRow } from "../components/ui/index.ts";
import type { ListGroup } from "./layout.ts";

export type ScheduleListProps = {
  groups: readonly ListGroup[];
  /** The dates the list covers, so a missing event outside them is not taken for none. */
  range: string;
  /** Shown when no group has an event: still loading, no match, or nothing coming. */
  emptyText: string;
  onOpen: (row: CalendarRow) => void;
};

/**
 * The schedule from today, or search results over the read window, one heading per day.
 * @model spec/calendar/presentation.md
 */
export function ScheduleList({ groups, range, emptyText, onOpen }: ScheduleListProps) {
  return (
    <section aria-label="Schedule" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <p className="px-4 py-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">{range}</p>
      {groups.length === 0 ? <EmptyState title={emptyText} /> : groups.map((group) => (
        <div key={group.key} role="group" aria-label={group.label}>
          <h2 className="px-4 pt-3 font-serif text-lg">{group.label}</h2>
          {group.items.map(({ row, time }) => (
            <ListRow key={row.id} title={row.title} detail={row.where ? `${time} · ${row.where}` : time} onClick={() => onOpen(row)} />
          ))}
        </div>
      ))}
    </section>
  );
}
