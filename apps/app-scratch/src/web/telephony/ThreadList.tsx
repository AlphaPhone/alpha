// spec/telephony/messages.md, "Story: Read my conversations while Messages is open"; spec/telephony/messages.md, "The list filters over each conversation's title and snippet with no request"
import { Users, X } from "lucide-react";
import type { Messages } from "../../../gen/telephony__messages.ts";
import { Avatar, Button, EmptyState, ListRow } from "../components/ui/index.ts";
import { matchesThread, queryOf, shortWhen, threadTitle } from "./present.ts";

export interface ThreadListProps {
  /** Messages' state: conversations, access, failure and the query. */
  messages: Messages;
  /** The time the rows are placed against. */
  now: number;
  /** Open a conversation. */
  onOpen: (threadId: string) => void;
  /** Allow SMS read access, Refresh and Load more. */
  onAllow: () => void;
  onRefresh: () => void;
  onMore: () => void;
  /** Clear Alpha's filter. */
  onClearQuery: () => void;
}

/**
 * The conversation list: unread in bold, an incomplete conversation offered to the system app, and an Alpha filter chip.
 * @model spec/telephony/messages.md
 * @design design.md
 */
export function ThreadList({ messages, now, onOpen, onAllow, onRefresh, onMore, onClearQuery }: ThreadListProps) {
  const query = queryOf(messages.listQuery);
  const rows = messages.threads.filter((t) => matchesThread(threadTitle(t.title, t.addresses), t.snippet, query.text));
  if (messages.access === "SmsNotGranted") return <EmptyState title="Allow messages"><Button onClick={onAllow}>Allow</Button></EmptyState>;
  if (messages.failed) return <EmptyState title="Messages could not be read"><Button variant="secondary" onClick={onRefresh}>Refresh</Button></EmptyState>;
  if (!messages.busy && messages.access === "SmsGranted" && messages.threads.length === 0) return <EmptyState title="No messages" />;
  return (
    <div className="flex flex-col">
      {query.chip && (
        <div className="px-4 py-2">
          <Button variant="secondary" size="sm" aria-label={`Clear filter ${query.chip}`} onClick={onClearQuery}>{query.chip}<X aria-hidden /></Button>
        </div>
      )}
      {query.text && rows.length === 0 && messages.threads.length > 0 && <EmptyState title="No matches" />}
      <ul className="divide-y divide-border">
        {rows.map((t) => {
          const title = t.complete ? threadTitle(t.title, t.addresses) : "Conversation content unavailable";
          return (
            <li key={t.id}>
              <ListRow
                title={<span className={t.unread ? "font-semibold" : undefined}>{title}</span>}
                detail={t.complete ? t.snippet : "Use the system messaging app to view this conversation."}
                leading={t.addresses.length > 1 ? <Users aria-hidden /> : <Avatar name={title} />}
                trailing={<span className="font-mono text-xs uppercase tabular-nums text-muted-foreground">{shortWhen(t.date, now)}</span>}
                disabled={!t.complete}
                aria-label={`${title}, ${shortWhen(t.date, now)}${t.unread ? ", unread" : ""}`}
                onClick={() => onOpen(t.id)}
              />
            </li>
          );
        })}
      </ul>
      {messages.more && <Button variant="ghost" onClick={onMore}>Load more</Button>}
    </div>
  );
}
