// spec/clock/deletions.md, "Story: Undo a reviewed deletion in time"
import { RefreshCw, Undo2, X } from "lucide-react";
import { canDismissOutcome, canUndo, noticeOf, type DeletionNotices } from "../../../gen/clock__deletions.ts";
import { Button } from "../components/ui/index.ts";
import { deletionReport, deletionRow } from "./text.ts";

/** The owner's pending deletions, and Undo, dismissal and a fresh read of them. */
export type DeletionUndoProps = {
  /** The owner's pending deletions as the journal reported them. */
  notices: DeletionNotices;
  onUndo: (key: string) => void;
  onDismiss: (key: string) => void;
  onRefresh: () => void;
};

/**
 * Undo for each reviewed deletion while Undo can still win; a refresh and a dismissal for an uncertain one.
 * @model spec/clock/deletions.md
 */
export function DeletionUndo({ notices, onUndo, onDismiss, onRefresh }: DeletionUndoProps) {
  const report = deletionReport(notices.report);
  if (!notices.rows.length && !report) return null;
  return (
    <section aria-label="Pending deletions" className="pointer-events-auto mx-3 flex flex-col gap-2">
      {notices.rows.map((row) => {
        const notice = noticeOf(row);
        const { title, message } = deletionRow(row, notice);
        return (
          <div key={row.key} role="status" className="flex min-h-14 items-center gap-3 rounded-lg bg-foreground px-4 text-background shadow-lg">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{title}</span>
              <span className="block text-xs">{message}</span>
            </span>
            {canUndo(notices, row.key) && <Button size="sm" variant="secondary" onClick={() => onUndo(row.key)}><Undo2 aria-hidden className="size-4" />Undo</Button>}
            {notice === "NoticeUncertain" && (
              <>
                <Button size="icon" variant="ghost" aria-label="Refresh receipt" onClick={onRefresh}><RefreshCw aria-hidden className="size-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Dismiss outcome" disabled={!canDismissOutcome(notices, row.key)} onClick={() => onDismiss(row.key)}><X aria-hidden className="size-4" /></Button>
              </>
            )}
          </div>
        );
      })}
      {report && <p role="status" className="rounded-lg bg-foreground px-4 py-3 text-sm text-background">{report}</p>}
    </section>
  );
}
