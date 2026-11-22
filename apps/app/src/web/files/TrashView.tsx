// spec/files/trash.md, "Story: See what is in Trash and how long it stays"; spec/files/trash.md, "Story: Restore or delete several Trash items together"; spec/files/storage.md, "An item's days left count down from 30 and never go below zero"
import { CheckCheck, RotateCcw, Trash2, X } from "lucide-react";
import type { TrashView as Trash } from "../../../gen/files__trash.ts";
import { showsEmptyTrash } from "../../../gen/files__trash.ts";
import { trashDaysLeft } from "../../../gen/files__storage.ts";
import { Alert, Button, EmptyState, ListRow, Skeleton } from "../components/ui/index.ts";
import { kindIcon } from "./FileRow.tsx";
import { formatSize, locationLabel } from "./format.ts";

export type TrashViewProps = {
  trash: Trash;
  /** Now, in milliseconds, for each item's days left. */
  now: number;
  /** The name of each volume by its ID; the primary one is `""`. */
  volumeName: (volume: string) => string;
  /** A change is in flight. */
  busy?: boolean;
  onShow: (key: string) => void;
  onToggle: (key: string) => void;
  onBeginSelecting: () => void;
  onSelectAll: () => void;
  onEndSelecting: () => void;
  onRestore: (keys: readonly string[]) => void;
  onReviewEmpty: () => void;
  onReviewChosen: () => void;
};

/**
 * Trash: every volume's items, newest first, each with its days left; restore or delete them together.
 * @model spec/files/trash.md
 */
export function TrashView({ trash, now, volumeName, busy = false, onShow, onToggle, onBeginSelecting, onSelectAll, onEndSelecting, onRestore, onReviewEmpty, onReviewChosen }: TrashViewProps) {
  const keys = trash.items.map((item) => item.key);
  return (
    <div className="flex flex-col">
      {trash.selecting ? (
        <div role="toolbar" aria-label="Trash selection" className="flex items-center gap-1 px-2">
          <Button variant="ghost" size="icon" aria-label="Cancel selection" onClick={onEndSelecting}><X className="size-5" /></Button>
          <span className="flex-1 text-sm tabular-nums">{trash.selected.length} selected</span>
          <Button variant="ghost" size="icon" aria-label="Select all" onClick={onSelectAll} disabled={busy}><CheckCheck className="size-5" /></Button>
          <Button variant="ghost" size="icon" aria-label="Restore" onClick={() => onRestore(trash.selected)} disabled={busy || trash.selected.length === 0}><RotateCcw className="size-5" /></Button>
          <Button variant="ghost" size="icon" aria-label="Delete permanently" onClick={onReviewChosen} disabled={busy || trash.selected.length === 0}><Trash2 className="size-5" /></Button>
        </div>
      ) : trash.items.length > 0 && (
        <div className="flex items-center justify-end gap-1 px-2">
          <Button variant="ghost" size="sm" onClick={onBeginSelecting} disabled={busy}>Select</Button>
          <Button variant="ghost" size="sm" onClick={() => onRestore(keys)} disabled={busy}>Restore all</Button>
          <Button variant="ghost" size="sm" onClick={onReviewEmpty} disabled={busy}>Empty</Button>
        </div>
      )}
      {trash.listing === "Failed" && <Alert role="alert" className="m-4">Trash could not be read.</Alert>}
      {trash.listing === "Partial" && <p role="status" className="px-4 py-2 text-sm text-muted-foreground">Some Trash locations could not be read.</p>}
      {trash.loading && trash.items.length === 0 && <div className="flex flex-col gap-2 p-4" aria-busy><Skeleton className="h-14" /><Skeleton className="h-14" /></div>}
      {showsEmptyTrash(trash) && <EmptyState title="Trash is empty. Items in Trash are deleted after 30 days." icon={<Trash2 className="size-10" />} />}
      <ul aria-label="Trash">
        {trash.items.map((item) => {
          const Icon = kindIcon(item.kind);
          const selected = trash.selected.includes(item.key);
          return (
            <li key={item.key}>
              <ListRow title={item.name} selected={selected} aria-pressed={trash.selecting ? selected : undefined}
                aria-label={trash.selecting ? `${selected ? "Deselect" : "Select"} ${item.name}` : item.name}
                detail={[item.directory ? "" : formatSize(item.size), locationLabel(volumeName(item.volume), item.origin)].filter(Boolean).join(" · ")}
                leading={<Icon aria-hidden className="size-6 text-muted-foreground" />}
                trailing={`${trashDaysLeft(item.deletedAt, now)}d`} disabled={busy}
                onClick={() => (trash.selecting ? onToggle(item.key) : onShow(item.key))}
                onContextMenu={(event) => { event.preventDefault(); onToggle(item.key); }} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
