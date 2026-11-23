// spec/inbox/mailbox.md, "Story: Read my mailbox page by page"; spec/inbox/selection.md, "Story: Change several messages at once"; spec/inbox/operations.md, "Swiping a listed message left reviews its archive at its current revision, and swiping right changes nothing"
import { useState } from "react";
import { Archive, CheckSquare, Mail, MailOpen, Paperclip, RotateCcw, Square, Star, Trash2 } from "lucide-react";
import type { Mailbox, MailRow } from "../../../gen/inbox__mailbox.ts";
import type { Selection, SelectAction, Picked } from "../../../gen/inbox__selection.ts";
import { canBeginMore } from "../../../gen/inbox__mailbox.ts";
import { swipeOf } from "../../../gen/inbox__operations.ts";
import { Avatar, Button, EmptyState, ListRow, Skeleton } from "../components/ui/index.ts";
import { cn } from "../lib/cn.ts";
import { emptyFolder, newerMail, readFailure } from "./messages.ts";

/** What the message list shows of one folder or search, its selection, and what its controls ask for. */
export type MailListProps = {
  /** The list as the mailbox machine holds it. */
  mailbox: Mailbox;
  /** The selection over the list. */
  selection: Selection;
  /** Whether the shown accounts are the saved ones, read-only until Cloud confirms them. */
  readOnly: boolean;
  onOpen: (row: MailRow) => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onToggle: (item: Picked) => void;
  onPickAll: (items: Picked[]) => void;
  onReview: (action: SelectAction) => void;
  onFinishSelecting: () => void;
  /** Whether a swipe left may start the reviewed archive of a row now. */
  canSwipeArchive: boolean;
  /** Starts the reviewed archive of a row swiped left. */
  onSwipeArchive: (row: MailRow) => void;
};

const time = (at: string) => {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return "";
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const actions: { action: SelectAction; label: string; icon: typeof Archive }[] = [
  { action: "SelArchive", label: "Archive", icon: Archive },
  { action: "SelTrash", label: "Move to Trash", icon: Trash2 },
  { action: "SelUnarchive", label: "Restore to Inbox", icon: RotateCcw },
  { action: "SelMarkRead", label: "Mark read", icon: MailOpen },
  { action: "SelMarkUnread", label: "Mark unread", icon: Mail },
  { action: "SelStar", label: "Star", icon: Star },
];

/**
 * The messages of one folder or search, newest first, with Load more, the changed-mailbox notice and selection.
 * @model spec/inbox/mailbox.md
 */
export function MailList({ mailbox, selection, readOnly, onOpen, onLoadMore, onRetry, onToggle, onPickAll, onReview, onFinishSelecting, canSwipeArchive, onSwipeArchive }: MailListProps) {
  const [press, setPress] = useState<{ readonly id: string; readonly x: number; readonly swiped: boolean } | undefined>(undefined);
  const selecting = selection.phase === "Selecting";
  const picked = new Set(selection.picked.map((p) => p.id));
  if (mailbox.phase === "ListLoading" && mailbox.rows.length === 0) {
    return (
      <div aria-label="Loading mail" className="flex flex-col gap-3 px-4 py-3">
        {[0, 1, 2, 3].map((n) => <Skeleton key={n} className="h-14 w-full" />)}
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      {mailbox.newerMail && (
        <button type="button" onClick={onRetry} className="mx-4 my-2 rounded-md bg-accent px-3 py-2 text-left text-sm text-accent-foreground">{newerMail}</button>
      )}
      {mailbox.cached && <p className="px-4 py-1 font-mono text-xs uppercase text-muted-foreground">{readOnly ? "Saved mail" : "Updating mail…"}</p>}
      {mailbox.phase === "ListFailed" && (
        <div role="status" className="mx-4 my-2 flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
          <span>{readFailure[mailbox.failure]}</span>
          <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>
        </div>
      )}
      {selecting && (
        <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1">
          <Button size="sm" variant="ghost" onClick={() => onPickAll(mailbox.rows.map((r) => ({ id: r.id, version: "" })))}>Select all</Button>
          {actions.map(({ action, label, icon: Icon }) => (
            <Button key={action} size="icon" variant="ghost" aria-label={label} disabled={selection.picked.length === 0 || readOnly} onClick={() => onReview(action)}><Icon aria-hidden /></Button>
          ))}
          <Button size="sm" variant="ghost" className="ml-auto" onClick={onFinishSelecting}>Done</Button>
        </div>
      )}
      {mailbox.rows.length === 0 && mailbox.phase === "ListReady" && <EmptyState title={mailbox.query ? "No messages match this search" : emptyFolder[mailbox.folder]} />}
      <ul className="flex flex-col">
        {mailbox.rows.map((row) => (
          <li
            key={row.id}
            onPointerDown={(event) => setPress({ id: row.id, x: event.clientX, swiped: false })}
            onPointerUp={(event) => {
              if (press?.id !== row.id) return;
              const swipe = swipeOf(Math.round(event.clientX - press.x));
              setPress({ ...press, swiped: swipe !== "SwipeShort" });
              if (swipe === "SwipeLeft" && canSwipeArchive && !selecting && !readOnly) onSwipeArchive(row);
            }}
            onClickCapture={(event) => { if (press?.id === row.id && press.swiped) { event.preventDefault(); event.stopPropagation(); setPress(undefined); } }}
          >
            <ListRow
              selected={picked.has(row.id)}
              aria-label={`${row.unread ? "Unread. " : ""}${row.sender}: ${row.subject}`}
              onClick={() => (selecting ? onToggle({ id: row.id, version: "" }) : onOpen(row))}
              leading={selecting ? (picked.has(row.id) ? <CheckSquare aria-hidden /> : <Square aria-hidden />) : <Avatar name={row.sender || row.senderAddress} size="sm" />}
              title={<span className={cn(row.unread && "font-semibold")}>{row.sender || row.senderAddress || "Unknown sender"}</span>}
              detail={<span className="line-clamp-1">{row.subject || "(no subject)"} · {row.snippet}</span>}
              trailing={
                <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                  {row.attached && <Paperclip aria-label="Attachment" className="size-3" />}
                  {row.starred && <Star aria-label="Starred" className="size-3 fill-current" />}
                  {time(row.receivedAt)}
                </span>
              }
            />
          </li>
        ))}
      </ul>
      {canBeginMore(mailbox) && (
        <Button variant="ghost" className="m-3" onClick={onLoadMore}>Load more</Button>
      )}
      {mailbox.phase === "ListLoading" && mailbox.loadingMore && <p role="status" className="px-4 py-2 text-sm text-muted-foreground">Loading more…</p>}
    </div>
  );
}
