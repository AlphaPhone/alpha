import { Newspaper } from "lucide-react";
import { Avatar } from "../Avatar.tsx";
import { AssistantCardFrame, type AssistantCardFrameProps } from "./AssistantCardFrame.tsx";

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

/** A digest of messages a reply gives; pressing its head opens the inbox. */
export function AssistantDigestCard({ title, rows, ...frame }: AssistantDigestCardProps) {
  return (
    <AssistantCardFrame icon={<Newspaper />} title={title} {...frame}>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-3">
            <Avatar name={row.who} size="sm" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-semibold">{row.who}</span>
              <span className="truncate text-sm text-muted-foreground">{row.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </AssistantCardFrame>
  );
}
