// spec/files/trash.md, "A permanent deletion first shows the rows it will erase, and erases only those Trash still lists"
import type { TrashView } from "../../../gen/files__trash.ts";
import { Button, Dialog, DialogContent, DialogTitle } from "../components/ui/index.ts";
import { countLabel } from "./format.ts";

/** The Trash confirmation on screen and how the owner answers it. */
export type EraseDialogProps = {
  trash: TrashView;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Asks before Trash erases the rows its confirmation shows, permanently.
 * @model spec/files/trash.md
 */
export function EraseDialog({ trash, busy = false, onConfirm, onCancel }: EraseDialogProps) {
  if (trash.confirm === "NoConfirm") return null;
  const title = trash.confirm === "EmptyAll" ? "Empty Trash?" : "Delete permanently?";
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onCancel()}>
      <DialogContent role="alertdialog">
        <DialogTitle>{title}</DialogTitle>
        <p className="text-sm">{countLabel(trash.confirming.length)} will be deleted permanently.</p>
        <ul aria-label="Items to delete" className="max-h-60 overflow-y-auto text-sm">
          {trash.confirming.map((key) => {
            const item = trash.items.find((i) => i.key === key);
            return <li key={key} className="truncate py-1">{item?.name ?? "An item no longer in Trash"}</li>;
          })}
        </ul>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} loading={busy}>{trash.confirm === "EmptyAll" ? "Empty" : "Delete"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
