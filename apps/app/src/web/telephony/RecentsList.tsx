// spec/telephony/phone.md, "Story: Read my recent calls while Phone is open"; spec/telephony/phone.md, "The bar's query filters Recents on the phone, and Alpha's filter returns to Recents"
import { ArrowDownLeft, ArrowUpRight, PhoneMissed, RotateCw, X } from "lucide-react";
import type { Phone, Recent } from "../../../gen/telephony__phone.ts";
import { Avatar, Button, EmptyState, ListRow } from "../components/ui/index.ts";
import { cn } from "../lib/cn.ts";
import { matchesCallQuery, queryOf, shortWhen, who } from "./present.ts";

export interface RecentsListProps {
  /** Phone's state: its rows, access and query. */
  phone: Phone;
  /** The time the rows are placed against. */
  now: number;
  /** Call a recent row's number. */
  onCall: (number: string) => void;
  /** The owner's Allow and Refresh. */
  onAllow: () => void;
  onRefresh: () => void;
  /** Clear Alpha's filter. */
  onClearQuery: () => void;
}

const ARROW = { InboundCall: ArrowDownLeft, OutboundCall: ArrowUpRight, MissedCall: PhoneMissed } as const;
const CALL_WORD = { InboundCall: "incoming", OutboundCall: "outgoing", MissedCall: "missed" } as const;

/**
 * Recents: newest first, missed calls red, each row one Call; access, failure and an Alpha filter chip in place of rows.
 * @model spec/telephony/phone.md
 * @design design.md
 */
export function RecentsList({ phone, now, onCall, onAllow, onRefresh, onClearQuery }: RecentsListProps) {
  const query = queryOf(phone.listQuery);
  const rows = phone.recents.filter((row) => matchesCallQuery({ title: row.title, number: row.number }, query.text));
  const busy = phone.reading || phone.dialing;
  return (
    <div className="flex flex-col">
      {query.chip && (
        <div className="px-4 py-2">
          <Button variant="secondary" size="sm" aria-label={`Clear filter ${query.chip}`} onClick={onClearQuery}>{query.chip}<X aria-hidden /></Button>
        </div>
      )}
      {phone.access === "LogNeeded" && (
        <EmptyState title="Allow call history"><Button onClick={onAllow} disabled={busy}>Allow</Button></EmptyState>
      )}
      {phone.notice.tag === "ReadFailed" && (
        <EmptyState title="Couldn’t load"><Button variant="secondary" onClick={onRefresh} aria-label="Refresh"><RotateCw aria-hidden /></Button></EmptyState>
      )}
      {phone.access === "LogAbsent" && <EmptyState title="No recents" />}
      {phone.access === "LogGranted" && !phone.reading && phone.recents.length === 0 && <EmptyState title="No recent calls" />}
      <ul className="divide-y divide-border">
        {rows.map((row: Recent) => {
          const name = who(row.title, row.number);
          const Arrow = ARROW[row.kind];
          return (
            <li key={row.id}>
              <ListRow
                title={<span className={cn(row.kind === "MissedCall" && "text-destructive")}>{name}</span>}
                leading={<Avatar name={name} />}
                detail={<Arrow aria-hidden className={cn("size-4", row.kind === "MissedCall" && "text-destructive")} />}
                trailing={<span className="font-mono text-xs uppercase tabular-nums text-muted-foreground">{shortWhen(row.date, now)}</span>}
                disabled={busy || !row.number}
                aria-label={`${row.number ? "Call " : ""}${name}, ${CALL_WORD[row.kind]} ${shortWhen(row.date, now)}`}
                onClick={() => row.number && onCall(row.number)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
