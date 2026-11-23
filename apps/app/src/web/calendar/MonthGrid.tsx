// spec/calendar/presentation.md, "The month grid has five weeks unless the month and its leading days need six"; spec/calendar/presentation.md, "The date picker is a modal over the view; a month offset exists only in the month view or the picker"
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarRow } from "../../calendar/model.vibe";
import { Button } from "../components/ui/index.ts";
import { cn, focusRing } from "../lib/cn.ts";
import { monthGrid } from "./layout.ts";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** The month a grid shows, its busy days and the day it picks. */
export type MonthGridProps = {
  rows: readonly CalendarRow[];
  /** The selected day, from today. */
  day: number;
  /** The month shown, from the selected day's month. */
  month: number;
  zone: string;
  now: number;
  onPickDay: (day: number) => void;
  onMonth: (month: number) => void;
};

/**
 * A month of days, Monday first, each marked when anything is on.
 * @model spec/calendar/presentation.md
 */
export function MonthGrid({ rows, day, month, zone, now, onPickDay, onMonth }: MonthGridProps) {
  const grid = monthGrid(day, month, rows, zone, now);
  return (
    <section aria-label={grid.title} className="flex flex-col gap-2 px-4 py-2">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => onMonth(month - 1)}><ChevronLeft /></Button>
        <span className="font-display text-xl">{grid.title}</span>
        <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => onMonth(month + 1)}><ChevronRight /></Button>
      </div>
      <div role="grid" className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((weekday, index) => <span key={index} aria-hidden className="text-center font-mono text-xs text-muted-foreground">{weekday}</span>)}
        {grid.cells.map((cell) => (
          <button key={cell.offset} type="button" role="gridcell" aria-current={cell.offset === day ? "date" : undefined}
            aria-label={`${cell.label}${cell.busy ? ", events" : ""}`} onClick={() => onPickDay(cell.offset)}
            className={cn(focusRing, "flex aspect-square flex-col items-center justify-center gap-1 rounded-md text-sm",
              !cell.inMonth && "text-muted-foreground", cell.offset === day && "bg-secondary", cell.offset === 0 && "font-semibold text-primary")}>
            {cell.label}
            <span aria-hidden className={cn("size-1 rounded-full", cell.busy ? (cell.offset === 0 ? "bg-primary" : "bg-foreground") : "bg-transparent")} />
          </button>
        ))}
      </div>
    </section>
  );
}
