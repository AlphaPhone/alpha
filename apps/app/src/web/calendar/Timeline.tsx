// spec/calendar/presentation.md, "The timeline runs from seven to midnight and grows to hold every event of the day"; spec/calendar/presentation.md, "A day view of three or more columns leads with the previous day"
import type { CalendarRow } from "../../calendar/model.vibe";
import { formatHour } from "../../calendar/time.ts";
import { cn, focusRing } from "../lib/cn.ts";
import { HOUR_PX, dayLabel, timeline } from "./layout.ts";

/** The rows, the day columns and the time a timeline lays out. */
export type TimelineProps = {
  /** Every row read for the window. */
  rows: readonly CalendarRow[];
  /** The days shown, as offsets from today; one for the day view, seven for the week. */
  days: readonly number[];
  /** The selected day, marked in its column heading. */
  day: number;
  zone: string;
  now: number;
  /** The empty-day word: free only after a complete read. */
  emptyText: string;
  onOpen: (row: CalendarRow) => void;
  onPickDay: (day: number) => void;
};

/**
 * The day or week timeline: all-day rows above, timed rows placed by the hour, and the current time on today.
 * @model spec/calendar/presentation.md
 */
export function Timeline({ rows, days, day, zone, now, emptyText, onOpen, onPickDay }: TimelineProps) {
  const columns = days.map((offset) => ({ offset, layout: timeline(rows, offset, zone, now) }));
  const first = Math.min(...columns.map((column) => column.layout.first));
  const last = Math.max(...columns.map((column) => column.layout.last));
  const height = Math.max(...columns.map((column) => column.layout.height));
  const empty = columns.every((column) => column.layout.segments.length === 0 && column.layout.allDay.length === 0);
  return (
    <section aria-label="Timeline" className="flex min-h-0 flex-1 flex-col">
      {days.length > 1 && (
        <div className="grid border-b border-border pl-12" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((offset) => (
            <button key={offset} type="button" onClick={() => onPickDay(offset)} aria-current={offset === day ? "date" : undefined}
              className={cn(focusRing, "py-2 font-mono text-xs uppercase tracking-widest", offset === day ? "text-foreground" : "text-muted-foreground", offset === 0 && "text-primary")}>
              {dayLabel(offset, zone, now)}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-1 border-b border-border px-4 py-2 empty:hidden">
        {columns.flatMap((column) => column.layout.allDay.map((row) => (
          <button key={`${column.offset}:${row.id}`} type="button" onClick={() => onOpen(row)} className={cn(focusRing, "truncate rounded-sm bg-secondary px-2 py-1 text-left text-sm")}>
            {days.length > 1 ? `${dayLabel(column.offset, zone, now)} · ${row.title}` : row.title}
          </button>
        )))}
      </div>
      {empty && <p role="status" className="px-4 py-3 text-center text-sm text-muted-foreground">{emptyText}</p>}
      <div tabIndex={0} aria-label="Hours" className={cn(focusRing, "relative min-h-0 flex-1 overflow-y-auto")}>
        <div className="relative" style={{ height }}>
          {Array.from({ length: last - first + 1 }, (_, index) => first + index).map((hour) => (
            <div key={hour} className="absolute left-0 right-0 border-t border-border" style={{ top: (hour - first) * HOUR_PX + 8 }}>
              <span className="absolute -top-2 left-1 w-10 bg-background font-mono text-xs text-muted-foreground">{formatHour(hour)}</span>
            </div>
          ))}
          <div className="absolute inset-y-0 left-12 right-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
            {columns.map((column) => (
              <div key={column.offset} className="relative">
                {column.layout.segments.map((segment) => (
                  <button key={segment.row.id} type="button" onClick={() => onOpen(segment.row)}
                    className={cn(focusRing, "absolute inset-x-0.5 overflow-hidden rounded-sm border-l-2 border-primary bg-secondary px-1.5 text-left text-xs", segment.row.source === "device" && "border-foreground")}
                    style={{ top: segment.top, height: segment.height }}>
                    <span className="block truncate font-medium">{segment.row.title}</span>
                    {segment.row.where && <span className="block truncate text-muted-foreground">{segment.row.where}</span>}
                  </button>
                ))}
                {column.layout.nowTop !== undefined && <div aria-hidden className="absolute inset-x-0 h-0.5 bg-primary" style={{ top: column.layout.nowTop }} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
