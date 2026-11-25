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
  /** Inbox's page is not up to date. */
  notCurrent?: boolean;
};

/** The mail card: the unread count over who wrote and about what; a press opens Inbox. */
export function HomeMailCard({ unread, more = false, lines, notCurrent = false, ...props }: HomeMailCardProps) {
  return (
    <HomeCard title={`${unread}${more ? "+" : ""} unread`} icon={<Inbox />} notCurrent={notCurrent ? "Not up to date" : undefined} {...props}>
      <HomeCardLines lines={lines} />
    </HomeCard>
  );
}
