import type { ComponentProps, ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

/** One day of the month grid. */
export interface CalendarMonthDay {
  key: number;
  date: number;
  /** Read aloud, such as "Tuesday November 24". */
  label: string;
  /** Outside the month shown: muted, unless it is today. */
  outside?: boolean;
  today?: boolean;
  selected?: boolean;
  /** Something is on the day. */
  busy?: boolean;
  /** Shows the day; left out where it cannot be chosen now. */
  onPick?: () => void;
}

/** One choice of a select of the panel. */
export interface CalendarMonthChoice { value: number; label: string }

export type CalendarMonthPanelProps = Omit<ComponentProps<"div">, "children"> & {
  /** The month and year shown, and every month and year that can be chosen. */
  month: number;
  year: number;
  months: ReadonlyArray<CalendarMonthChoice>;
  years: ReadonlyArray<CalendarMonthChoice>;
  onMonth: (month: number) => void;
  onYear: (year: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  /** Closes the panel, as a press on the dimmed page behind it does. */
  onClose: () => void;
  /** The weeks of the month shown, Monday first. */
  days: ReadonlyArray<CalendarMonthDay>;
  /** Under the grid: the layouts and what else the calendar offers. */
  children?: ReactNode;
};

/** The month dialog under Calendar's title: choose a month and a year, step through months, and pick a day. */
export function CalendarMonthPanel({ month, year, months, years, onMonth, onYear, onPrevious, onNext, onClose, days, className, children, ...props }: CalendarMonthPanelProps) {
  const select = cn(focusRing, "min-h-11 min-w-0 border-0 bg-background text-lead leading-plain text-foreground");
  const icon = cn(focusRing, "inline-flex size-11 shrink-0 items-center justify-center rounded-full active:bg-accent [&_svg]:size-5.5");
  return (
    <div className={cn("absolute inset-0 z-20", className)} {...props}>
      <button type="button" aria-hidden tabIndex={-1} onClick={onClose} className="absolute inset-0 size-full bg-foreground/18 dark:bg-background/55" />
      <div role="dialog" aria-modal="true" aria-label="Choose calendar date"
        className="absolute inset-x-0 top-11 box-border max-h-[calc(100%-64px)] overflow-auto rounded-sheet bg-background px-4 pt-3 pb-5">
        <div className="mb-3 flex items-center gap-1">
          <select aria-label="Calendar month" value={month} onChange={(event) => onMonth(Number(event.target.value))} className={cn(select, "flex-1")}>
            {months.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
          </select>
          <select aria-label="Calendar year" value={year} onChange={(event) => onYear(Number(event.target.value))} className={cn(select, "w-18.5")}>
            {years.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
          </select>
          <button type="button" aria-label="Previous month" onClick={onPrevious} className={icon}><ChevronLeft aria-hidden /></button>
          <button type="button" aria-label="Next month" onClick={onNext} className={icon}><ChevronRight aria-hidden /></button>
          <button type="button" aria-label="Close month" onClick={onClose} className={icon}><X aria-hidden /></button>
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {days.map((day) => (
            <button key={day.key} type="button" aria-label={day.label} aria-current={day.selected ? "date" : undefined} disabled={!day.onPick} onClick={day.onPick}
              className={cn(focusRing, "flex flex-col items-center gap-0.5 rounded-lg py-0.5 disabled:cursor-default")}>
              <span className={cn("flex size-9.5 items-center justify-center rounded-full text-sm leading-plain font-semibold",
                day.today ? "bg-alpha text-alpha-foreground" : day.selected && "ring-[1.5px] ring-foreground ring-inset", day.outside && !day.today && "text-muted-foreground")}>{day.date}</span>
              <span aria-hidden className={cn("size-1 rounded-full", day.busy ? (day.today ? "bg-primary" : "bg-foreground") : "bg-transparent")} />
            </button>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}

export type CalendarPillProps = ComponentProps<"button"> & {
  /** Chosen: the pill is filled with the text color. */
  pressed?: boolean;
};

/** A choice of the month dialog, such as a layout: a quiet pill, filled once chosen. */
export function CalendarPill({ pressed, className, ...props }: CalendarPillProps) {
  return (
    <button type="button" aria-pressed={pressed} className={cn(focusRing, "min-h-11 rounded-full px-4 text-sm leading-plain font-semibold disabled:opacity-50",
      pressed ? "bg-foreground text-background" : "bg-secondary text-foreground", className)} {...props} />
  );
}
