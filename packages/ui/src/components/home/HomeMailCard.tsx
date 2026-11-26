import type { ComponentProps } from "react";
import { Inbox } from "lucide-react";
import { HomeCard, type HomeCardLine, HomeCardLines } from "./HomeCard.tsx";

export type HomeMailCardProps = Omit<ComponentProps<"button">, "children" | "title"> & {
  /** How many messages are unread. */
  unread: number;
  /** The count covers a partial page and can be higher. */
  more?: boolean;
  /** The unread messages Inbox loaded: subject and sender, never a body. */
  lines: readonly HomeCardLine[];
  /** Which account and when Inbox read it, "Updating email…" while it reads, or "Open to retry" with when it last read. */
  status?: string;
};

/** The mail card: the unread count over who wrote and about what, and when it was read; a press opens Inbox. */
export function HomeMailCard({ unread, more = false, lines, status = "", ...props }: HomeMailCardProps) {
  return (
    <HomeCard title={`${unread}${more ? "+" : ""} unread`} icon={<Inbox />} status={status} {...props}>
      <HomeCardLines lines={lines} />
    </HomeCard>
  );
}
