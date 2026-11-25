import { cn, focusRing } from "../../lib/cn.ts";
import type { AssistantCardFrameProps } from "./AssistantCardFrame.tsx";

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

/** A day's agenda a reply gives, a row for each event; pressing it opens the day in Calendar. */
export function AssistantAgendaCard({ title, rows, onOpen, settled = false }: AssistantAgendaCardProps) {
  const list = (
    <span className="flex w-full flex-col">
      <span className="sr-only">{title}</span>
      {rows.map((row) => (
        <span key={row.id} className="flex items-center gap-3.5 border-b border-border px-4 py-3.25">
          <span className="w-10 shrink-0 text-meta text-muted-foreground tabular-nums">{row.time}</span>
          <span aria-hidden className="size-1.75 shrink-0 rounded-full bg-border" />
          <span className={cn("min-w-0 text-base break-words", settled && "text-muted-foreground")}>{row.title}</span>
        </span>
      ))}
    </span>
  );
  const surface = "w-full overflow-hidden rounded-tile bg-secondary text-left text-secondary-foreground";
  return onOpen && !settled ? (
    <button type="button" onClick={onOpen} className={cn(focusRing, surface, "active:bg-accent")}>{list}</button>
  ) : (
    <div className={surface}>{list}</div>
  );
}
