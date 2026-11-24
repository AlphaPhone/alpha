import { ListGroup } from "../ListGroup.tsx";
import { ListRow } from "../ListRow.tsx";
import { Sheet, SheetContent } from "../Sheet.tsx";
import type { HomeTileItem } from "./HomeTileGrid.tsx";

export type AddToHomeSheetProps = {
  /** Add to Home is open; the parent keeps it. */
  open: boolean;
  /** Alpha's own apps this phone admits and Home does not hold, in Home order. */
  apps: readonly Omit<HomeTileItem, "badge">[];
  /** Puts an app back on Home; left out while a change is being saved, so the rows refuse. */
  onAdd?: (id: string) => void;
  /** Closes the sheet: Back, Escape or a press outside. */
  onClose: () => void;
};

/** The sheet, while Home is being edited, of Alpha's own apps that can be put back on Home. */
export function AddToHomeSheet({ open, apps, onAdd, onClose }: AddToHomeSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent title="Add to Home">
        <ListGroup surface="plain">
          {apps.map((app) => (
            <ListRow key={app.id} title={app.label} leading={app.icon} disabled={!onAdd} onClick={() => onAdd?.(app.id)} />
          ))}
        </ListGroup>
      </SheetContent>
    </Sheet>
  );
}
