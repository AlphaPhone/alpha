import type { ComponentProps } from "react";
import { Calendar } from "lucide-react";
import { HomeCard } from "./HomeCard.tsx";

/** An event or a reminder as the agenda card shows it. */
export type HomeAgendaItem = {
  title: string;
  /** When it is, or was due, such as "3:00 PM" or "Due 9:00 AM". */
  when: string;
  /** Where it was read: the calendar's name, "Alpha" for the agent's calendar, or "Reminder". */
  source: string;
};

export type HomeAgendaCardProps = Omit<ComponentProps<"button">, "children" | "title"> & {
  /** What the card leads with: the overdue reminder, or else the next item that has not ended. */
  item: HomeAgendaItem;
  /** The item's day or the number of overdue reminders. */
  heading?: string;
  /** The item is an overdue reminder. */
  overdue?: boolean;
  /** Under an overdue reminder, the next item that is not overdue. */
  next?: HomeAgendaItem;
  /** Its calendar was not read today, or failed, could not be reached or ran out. */
  notCurrent?: boolean;
};

/**
 * The agenda card: what needs the owner first and where it was read; a press opens Calendar.
 * @model spec/app/home/cards.md
 */
export function HomeAgendaCard({ item, heading, overdue = false, next, notCurrent = false, ...props }: HomeAgendaCardProps) {
  return (
    <HomeCard variant="agenda" title={heading ?? (overdue ? "Overdue reminder" : "Next")} icon={<Calendar />} notCurrent={notCurrent ? "Not up to date" : undefined} {...props}>
      <span className="flex min-h-0 flex-1 items-center">
        <span className="line-clamp-3 font-display text-home-display tracking-tight wrap-anywhere">{item.title}</span>
      </span>
      <span className="flex min-w-0 items-baseline justify-between gap-2.5 text-sm leading-snug font-medium">
        <span className="truncate">{item.when}</span>
        <span className="truncate text-right text-xs text-alpha-foreground/85">{item.source}</span>
      </span>
      {next ? (
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm leading-snug font-medium wrap-anywhere">{next.title} · {next.when}</span>
          <span className="text-xs text-alpha-foreground/85">{next.source}</span>
        </span>
      ) : null}
    </HomeCard>
  );
}
