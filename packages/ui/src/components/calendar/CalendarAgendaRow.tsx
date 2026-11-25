import type { ComponentProps } from "react";
import { cn, focusRing } from "../../lib/cn.ts";

export type CalendarAgendaRowProps = Omit<ComponentProps<"button">, "title" | "children"> & {
  /** When it is, such as "3:00 PM – 4:00 PM" or "All day". */
  time: string;
  title: string;
  /** Where it is, under the title. */
  where?: string;
};

/** One event of the schedule or of search results: its time, its title and where it is. */
export function CalendarAgendaRow({ time, title, where, className, ...props }: CalendarAgendaRowProps) {
  return (
    <button type="button" aria-label={`${title}, ${time}`}
      className={cn(focusRing, "mb-2 box-border flex min-h-12 w-full flex-col gap-1 rounded-md bg-secondary px-4 py-3 text-left wrap-anywhere text-foreground disabled:cursor-default", className)} {...props}>
      <span className="text-meta leading-plain text-muted-foreground">{time}</span>
      <strong className="text-body leading-snug">{title}</strong>
      {where ? <span className="text-meta leading-plain text-muted-foreground">{where}</span> : null}
    </button>
  );
}

export type CalendarListProps = ComponentProps<"div"> & {
  /** What the list is, read aloud: "Schedule" or "Search results". */
  "aria-label": string;
  /** The dates the list covers, such as "Through Jan 31". */
  range?: string;
};

/** The schedule or search results: the dates covered, then each day's heading and its events. */
export function CalendarList({ range, className, children, ...props }: CalendarListProps) {
  return (
    <div role="region" tabIndex={0} className={cn(focusRing, "box-border grow overflow-y-auto border-t border-border px-4 pt-2 pb-30 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)} {...props}>
      {range ? <p className="mt-1 mb-1 text-meta leading-plain text-muted-foreground">{range}</p> : null}
      {children}
    </div>
  );
}

/** A day's heading in the schedule or the search results. */
export function CalendarListHeading({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("mt-4 mb-2 text-base leading-plain font-semibold", className)} {...props} />;
}
