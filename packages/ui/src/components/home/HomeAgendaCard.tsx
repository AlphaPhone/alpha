import type { ComponentProps } from "react";
import { CalendarGlyph } from "../../lib/icons.ts";
import { HomeCard } from "./HomeCard.tsx";

/** An event or a reminder as the agenda card shows it. */
export type HomeAgendaItem = {
  title: string;
  /** When it is, or was due, such as "9:30 AM – 10:00 AM", "All day" or "Due 9:00 AM". */
  when: string;
};

/** The item named under an overdue reminder, as one line, and where it was read. */
export type HomeAgendaNext = {
  /** Such as "Next: Design review 3:00 PM". */
  text: string;
  /** Where it was read: the calendar's name, "Alpha" for the agent's calendar, or "Reminder". */
  source: string;
};

export type HomeAgendaCardProps = Omit<ComponentProps<"button">, "children" | "title"> & {
  /** What the card leads with: the overdue reminder, or else the next item that has not ended. */
  item: HomeAgendaItem;
  /** The item's day, or the number of overdue reminders. */
  heading: string;
  /** Where the item was read, beside the heading; left out for an overdue reminder, which the heading names. */
  origin?: string;
  /** Under an overdue reminder, the next item that is not overdue. */
  next?: HomeAgendaNext;
  /** Why the item may not be up to date, such as "Not updated since 9:00 AM"; left out when it is current. */
  readLine?: string;
};

/**
 * The agenda card: what needs the owner first and where it was read; a press opens Calendar.
 * @model spec/app/home/cards.md
 */
export function HomeAgendaCard({ item, heading, origin, next, readLine, ...props }: HomeAgendaCardProps) {
  return (
    <HomeCard variant="agenda" title={heading} origin={origin} icon={<CalendarGlyph />} {...props}>
      <span className="flex min-h-0 flex-1 items-center">
        <span className="line-clamp-3 font-display text-home-display font-light tracking-tight wrap-anywhere [font-variation-settings:'opsz'_144]">{item.title}</span>
      </span>
      <span className="flex min-w-0 items-baseline justify-between gap-2.5">
        <span className="shrink truncate text-sm leading-snug font-medium">{item.when}</span>
        {readLine ? <span className="min-w-0 flex-1 truncate text-right text-xs leading-snug font-medium text-alpha-foreground/85">{readLine}</span> : null}
      </span>
      {next ? (
        <span className="flex min-w-0 flex-col items-start gap-0.5">
          <span className="max-w-full text-sm leading-snug font-medium wrap-anywhere">{next.text}</span>
          {next.source ? <span className="max-w-full truncate text-xs leading-snug font-medium text-alpha-foreground/85">{next.source}</span> : null}
        </span>
      ) : null}
    </HomeCard>
  );
}
