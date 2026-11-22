// spec/files/trash.md, "A permanent deletion first shows the rows it will erase, and erases only those Trash still lists"
import { RotateCcw, Trash2 } from "lucide-react";
import type { TrashView } from "../../../gen/files__trash.ts";
import { Button, Sheet, SheetContent } from "../components/ui/index.ts";
import { locationLabel } from "./format.ts";

export type TrashItemSheetProps = {
  trash: TrashView;
  volumeName: (volume: string) => string;
  busy?: boolean;
  onRestore: (key: string) => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onClose: () => void;
};

/**
 * One Trash item: where it came from, restore it, or delete it after asking again.
 * @model spec/files/trash.md
 */
export function TrashItemSheet({ trash, volumeName, busy = false, onRestore, onDelete, onConfirmDelete, onClose }: TrashItemSheetProps) {
  const item = trash.items.find((i) => i.key === trash.opened);
  const asking = trash.confirm === "DeleteOne";
  return (
    <Sheet open={item !== undefined} onOpenChange={(open) => !open && !busy && onClose()}>
      <SheetContent side="bottom" title={item?.name ?? "Trash item"}>
        {item && (
          <div className="flex flex-col gap-3 px-5 pb-5">
            <p className="text-sm text-muted-foreground">{asking ? "Delete permanently?" : locationLabel(volumeName(item.volume), item.origin)}</p>
            <div className="flex justify-end gap-2">
              {!asking && <Button variant="outline" onClick={() => onRestore(item.key)} disabled={busy}><RotateCcw className="size-4" />Restore</Button>}
              <Button variant="destructive" onClick={asking ? onConfirmDelete : onDelete} loading={busy}>
                <Trash2 className="size-4" />{asking ? "Delete permanently" : "Delete now"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
