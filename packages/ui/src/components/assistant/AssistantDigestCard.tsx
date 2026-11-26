import { ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import { Avatar } from "../Avatar.tsx";
import { AssistantCardRows, type AssistantCardFrameProps } from "./AssistantCardFrame.tsx";

export type AssistantDigestRow = {
  /** Keeps the row in place between replies. */
  id: string;
  /** Who it is from. */
  who: string;
  /** What it says, a line. */
  text: string;
};

export type AssistantDigestCardProps = Pick<AssistantCardFrameProps, "settled" | "onOpen"> & {
  /** What the digest covers, such as "3 new messages". */
  title: string;
  /** The items, newest first. */
  rows: AssistantDigestRow[];
};

/** A digest of messages a reply gives, a row for each message under one another; pressing it opens the inbox. */
export function AssistantDigestCard({ title, rows, onOpen, settled = false }: AssistantDigestCardProps) {
  return (
    <AssistantCardRows title={title} onOpen={onOpen} settled={settled}>
      {rows.map((row) => (
        <span key={row.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
          <Avatar name={row.who} aria-hidden className="size-8.5 bg-accent text-xs font-bold" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={cn("truncate text-sm font-semibold", settled && "text-muted-foreground")}>{row.who}</span>
            <span className="truncate text-caption text-muted-foreground">{row.text}</span>
          </span>
          <ChevronRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        </span>
      ))}
    </AssistantCardRows>
  );
}
