import { Button } from "../Button.tsx";
import { Skeleton } from "../Skeleton.tsx";
import { InboxMessageRow, type InboxMessageRowProps } from "./InboxMessageRow.tsx";

export type InboxListRow = InboxMessageRowProps & {
  /** Names the message among the others. */
  id: string;
};

export type InboxListProps = {
  /** The messages of the page or pages read, newest first; those an operation holds are left out by the parent. */
  rows: InboxListRow[];
  /** A first page is being read: with no rows, placeholders stand in; with rows, they stay and are marked busy. */
  loading?: boolean;
  /** Reads the next page; offered only while the list has a page cursor left and mail can be read, so the last page and a saved list leave it out. */
  onLoadMore?: () => void;
  /** The next page is being read: Load more spins and refuses. */
  loadingMore?: boolean;
};

/**
 * The messages of the account, folder and search shown, with the way to read further back.
 *
 * @model spec/app/inbox/index.md
 */
export function InboxList({ rows, loading = false, onLoadMore, loadingMore = false }: InboxListProps) {
  if (loading && rows.length === 0) {
    return (
      <div role="status" aria-label="Loading mail" className="flex flex-col gap-4 py-2">
        {[0, 1, 2, 3, 4].map((n) => (
          <div key={n} className="flex items-center gap-3 px-3">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2"><Skeleton className="w-2/5" /><Skeleton /></div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <ul aria-label="Email messages" aria-busy={loading || undefined} className="-mx-4 flex flex-col">
        {rows.map(({ id, ...row }) => (
          <li key={id}><InboxMessageRow {...row} /></li>
        ))}
      </ul>
      {onLoadMore ? <Button variant="secondary" loading={loadingMore} onClick={onLoadMore} className="self-center">Load more</Button> : null}
    </div>
  );
}
