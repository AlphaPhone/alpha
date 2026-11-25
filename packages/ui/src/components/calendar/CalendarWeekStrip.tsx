import type { ComponentProps } from "react";
import { cn, focusRing } from "../../lib/cn.ts";

/** One day of the week strip. */
export interface CalendarStripDay {
  /** A stable key: the day's number of days since 1970. */
  key: number;
  /** The weekday's initial, over the date. */
  letter: string;
  /** The date of the month. */
  date: number;
  /** Read aloud for the day, such as "Tuesday, November 24". */
  label: string;
  /** The day is today: a filled circle. */
  today?: boolean;
  /** The day is the one shown: a ring, unless it is today. */
  selected?: boolean;
  /** Something is on the day: a dot under the date. */
  busy?: boolean;
  /** Shows the day; left out, the day cannot be chosen now. */
  onPick?: () => void;
}

export type CalendarWeekStripProps = Omit<ComponentProps<"nav">, "children"> & {
  /** The seven days, Monday first. */
  days: ReadonlyArray<CalendarStripDay>;
};

/** Calendar's week strip: a weekday initial, the date in a circle, and a dot where something is on. */
export function CalendarWeekStrip({ days, className, ...props }: CalendarWeekStripProps) {
  return (
    <nav aria-label="Week" data-alpha-calendar-week="" className={cn("grid shrink-0 grid-cols-7 px-3 pt-1 pb-2", className)} {...props}>
      {days.map((day) => (
        <button key={day.key} type="button" aria-label={day.label} aria-current={day.selected ? "date" : undefined} disabled={!day.onPick} onClick={day.onPick}
          className={cn(focusRing, "flex min-w-0 flex-col items-center gap-1.25 rounded-lg py-1 disabled:cursor-default")}>
          <span className="text-2xs leading-tight font-medium text-muted-foreground">{day.letter}</span>
          <span className={cn("flex size-10 items-center justify-center rounded-full text-base leading-plain font-semibold",
            day.today ? "bg-alpha text-alpha-foreground" : day.selected && "ring-[1.5px] ring-foreground ring-inset")}>{day.date}</span>
          <span aria-hidden className={cn("size-1 rounded-full", day.busy ? (day.today ? "bg-primary" : "bg-muted-foreground") : "bg-transparent")} />
        </button>
      ))}
    </nav>
  );
}
