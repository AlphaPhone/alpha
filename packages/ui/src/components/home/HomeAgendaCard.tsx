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
export function HomeAgendaCard({ item, overdue = false, next, notCurrent = false, ...props }: HomeAgendaCardProps) {
  return (
    <HomeCard title={overdue ? "Overdue" : "Next"} icon={<Calendar />} notCurrent={notCurrent ? "Not up to date" : undefined} {...props}>
      <span className="line-clamp-3 font-display text-2xl font-light break-words">{item.title}</span>
      <span className="text-sm text-muted-foreground">{item.when} · {item.source}</span>
      {next ? (
        <span className="mt-auto flex min-w-0 flex-col pt-2">
          <span className="truncate font-semibold">{next.title}</span>
          <span className="text-sm text-muted-foreground">{next.when} · {next.source}</span>
        </span>
      ) : null}
    </HomeCard>
  );
}
