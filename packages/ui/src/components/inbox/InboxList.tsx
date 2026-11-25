import { cn, focusRing } from "../../lib/cn.ts";
import { InboxMessageRow, type InboxMessageRowProps } from "./InboxMessageRow.tsx";

export type InboxListRow = InboxMessageRowProps & {
  /** Names the message among the others. */
  id: string;
};

export type InboxListProps = {
  /** The messages of the page or pages read, newest first; those an operation holds are left out by the parent. */
  rows: InboxListRow[];
  /** A first page is being read: with rows, they stay and are marked busy. */
  loading?: boolean;
  /** Reads the next page; offered only while the list has a page cursor left and mail can be read, so the last page and a saved list leave it out. */
  onLoadMore?: () => void;
  /** The next page is being read: Load more says so and refuses. */
  loadingMore?: boolean;
};

/**
 * The messages of the account, folder and search shown, with the way to read further back.
 *
 * @model spec/app/inbox/index.md
 */
export function InboxList({ rows, loading = false, onLoadMore, loadingMore = false }: InboxListProps) {
  return (
    <div className="-mx-4 flex flex-col">
      <ul aria-label="Email messages" aria-busy={loading || undefined} className="flex flex-col">
        {rows.map(({ id, ...row }) => (
          <li key={id}><InboxMessageRow {...row} /></li>
        ))}
      </ul>
      {onLoadMore ? (
        <button
          type="button"
          aria-busy={loadingMore}
          aria-live="polite"
          disabled={loadingMore}
          onClick={onLoadMore}
          className={cn(focusRing, "mx-auto my-3 block h-11 rounded-full bg-secondary px-5 text-sm font-semibold text-secondary-foreground disabled:opacity-50")}
        >
          {loadingMore ? "Loading more…" : "Load more"}
        </button>
      ) : null}
    </div>
  );
}
