import { CalendarDays } from "lucide-react";
import { AssistantCardFrame, type AssistantCardFrameProps } from "./AssistantCardFrame.tsx";

export type AssistantAgendaRow = {
  /** Keeps the row in place between replies. */
  id: string;
  /** When it starts, as the owner reads it. */
  time: string;
  /** What it is. */
  title: string;
};

export type AssistantAgendaCardProps = Pick<AssistantCardFrameProps, "settled" | "onOpen"> & {
  /** The day the agenda is of, such as "Today". */
  title: string;
  /** The day's events, in order. */
  rows: AssistantAgendaRow[];
};

/** A day's agenda a reply gives; pressing its head opens the day in Calendar. */
export function AssistantAgendaCard({ title, rows, ...frame }: AssistantAgendaCardProps) {
  return (
    <AssistantCardFrame icon={<CalendarDays />} title={title} {...frame}>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.id} className="flex gap-3">
            <span className="w-14 shrink-0 text-sm text-muted-foreground tabular-nums">{row.time}</span>
            <span className="min-w-0 break-words">{row.title}</span>
          </li>
        ))}
      </ul>
    </AssistantCardFrame>
  );
}
