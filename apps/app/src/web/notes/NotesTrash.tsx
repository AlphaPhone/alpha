// spec/notes/trash.md, "Recently deleted opens while it has rows, one action runs at a time, and it closes once empty"; spec/notes/trash.md, "Every Trash dialog is named by the actions it offers and the note it reviews"; spec/notes/trash.md, "A restore needs the exact deletion and the current revision, and a delete's Undo the exact deletion"; spec/notes/trash.md, "Erase needs the three-day choice, a review of that exact deletion at the current revision, and no shared recording"
import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import { askDialogName, eraseDialogName, type TrashView } from "../../../gen/notes__trash.ts";
import { Button, Dialog, DialogContent, DialogTitle, ListRow } from "../components/ui/index.ts";
import type { TrashRow } from "../../notes/trash.vibe";
import { daysLeftText, deletedText } from "./messages.ts";

export type NotesTrashProps = {
  /** The Trash machine's state. */
  view: TrashView;
  /** Recently deleted, newest deletion first. */
  rows: readonly TrashRow[];
  /** The row the owner tapped. */
  asked?: TrashRow;
  /** Whether the rules allow each control now. */
  canAsk: boolean;
  canRestore: boolean;
  canAskErase: boolean;
  canErase: boolean;
  onClose: () => void;
  onAsk: (row: TrashRow) => void;
  onCloseAsk: () => void;
  onRestore: (row: TrashRow) => void;
  onAskErase: (all: boolean) => void;
  onCancelErase: () => void;
  onErase: () => void;
};

/**
 * Recently deleted: restore a note exactly as it was, or, with the three-day choice, delete it for good after one more question.
 * @model spec/notes/trash.md
 */
export function NotesTrash({ view, rows, asked, canAsk, canRestore, canAskErase, canErase, onClose, onAsk, onCloseAsk, onRestore, onAskErase, onCancelErase, onErase }: NotesTrashProps) {
  const reviewed = asked === undefined || asked.title.trim() === "" ? "deleted note" : asked.title;
  return (
    <section className="flex h-full flex-col" aria-label="Recently deleted">
      <header className="flex flex-wrap items-center gap-2 px-2 py-2">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={onClose}><ArrowLeft aria-hidden /></Button>
        <h1 className="min-w-0 flex-1 font-display text-2xl [overflow-wrap:anywhere]">Recently deleted</h1>
        {view.retentionOn && <Button variant="ghost" disabled={!canAskErase} onClick={() => onAskErase(true)}>Delete all</Button>}
      </header>
      <ul className="flex flex-col divide-y divide-border overflow-y-auto">
        {rows.map((row) => (
          <li key={`${row.id}:${row.deletedAt}`}>
            <ListRow title={row.title} detail={[row.kind, deletedText(row.deletedAt)].filter(Boolean).join(" · ")} disabled={!canAsk || view.busy !== "TrashIdle"}
              trailing={view.retentionOn ? <span className="font-mono text-xs uppercase" aria-label={daysLeftText(row.daysLeft)}>{row.daysLeft}d</span> : undefined}
              aria-label={view.retentionOn ? `${row.title}, ${daysLeftText(row.daysLeft)}` : row.title}
              onClick={() => onAsk(row)} />
          </li>
        ))}
      </ul>
      <Dialog open={view.asking && asked !== undefined} onOpenChange={(open) => { if (!open) onCloseAsk(); }}>
        <DialogContent aria-label={`${askDialogName(view.retentionOn) === "RecoverOrDeleteName" ? "Recover or delete" : "Recover"} ${reviewed}`}>
          <DialogTitle>{asked?.title}</DialogTitle>
          {asked !== undefined && deletedText(asked.deletedAt) !== "" && <p className="text-sm text-muted-foreground">{deletedText(asked.deletedAt)}</p>}
          <div className="flex justify-end gap-2">
            {view.retentionOn && <Button variant="destructive" disabled={!canAskErase} onClick={() => onAskErase(false)}><Trash2 aria-hidden />Delete now</Button>}
            <Button disabled={!canRestore || asked === undefined} onClick={() => asked && onRestore(asked)}><RotateCcw aria-hidden />Recover</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={view.confirm !== "NoConfirm"} onOpenChange={(open) => { if (!open) onCancelErase(); }}>
        <DialogContent aria-label={eraseDialogName(view.confirm === "ConfirmAll") === "DeleteAllName" ? "Delete all of Recently deleted permanently" : `Delete ${reviewed} permanently`}>
          <DialogTitle>{view.confirm === "ConfirmAll" ? "Delete all?" : `Delete “${asked?.title ?? "this note"}”?`}</DialogTitle>
          <p className="text-sm text-muted-foreground">This can’t be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancelErase}>Cancel</Button>
            <Button variant="destructive" disabled={!canErase} onClick={onErase}>{view.confirm === "ConfirmAll" ? "Delete all" : "Delete"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
