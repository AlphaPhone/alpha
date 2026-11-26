import { cn } from "../../lib/cn.ts";
import { AssistantCardRows, type AssistantCardFrameProps } from "./AssistantCardFrame.tsx";

export type AssistantAgendaRow = {
  /** Keeps the row in place between replies. */
  id: string;
  /** When it starts, as the owner reads it. */
  time: string;
  /** What it is. */
  title: string;
  /** The one that matters most in the day, marked in Alpha blue. */
  marked?: boolean;
};

export type AssistantAgendaCardProps = Pick<AssistantCardFrameProps, "settled" | "onOpen"> & {
  /** The day the agenda is of, such as "Today". */
  title: string;
  /** The day's events, in order. */
  rows: AssistantAgendaRow[];
};

/** A day's agenda a reply gives, a row for each event; pressing it opens the day in Calendar. */
export function AssistantAgendaCard({ title, rows, onOpen, settled = false }: AssistantAgendaCardProps) {
  return (
    <AssistantCardRows title={title} onOpen={onOpen} settled={settled}>
      {rows.map((row) => (
        <span key={row.id} className="flex items-center gap-3.5 border-b border-border px-4 py-3.25 last:border-b-0">
          <span className="w-10 shrink-0 text-meta text-muted-foreground tabular-nums">{row.time}</span>
          <span aria-hidden className={cn("size-1.75 shrink-0 rounded-full", row.marked && !settled ? "bg-alpha" : "bg-border")} />
          <span className={cn("min-w-0 text-base break-words", settled && "text-muted-foreground")}>{row.title}</span>
        </span>
      ))}
    </AssistantCardRows>
  );
}
