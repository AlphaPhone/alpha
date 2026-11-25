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
      <SheetContent
        title="Add to Home"
        overlayClassName="z-50 bg-black/25 motion-safe:animate-none dark:bg-black/25"
        className="bottom-0 z-50 gap-3 bg-background px-4 pt-4.5 pb-[calc(--spacing(6)+max(108px,calc(var(--alpha-dock-clearance,102px)+6px)))] text-foreground shadow-none before:hidden motion-safe:animate-none dark:shadow-none [&_h2]:px-1 [&_h2]:font-sans [&_h2]:text-date [&_h2]:leading-plain [&_h2]:font-semibold"
      >
        <ListGroup surface="plain" className="[&>div]:gap-1">
          {apps.map((app) => (
            <ListRow
              key={app.id}
              title={app.label}
              leading={<span className="grid size-10 place-items-center rounded-list-icon bg-secondary text-foreground [&>svg]:size-6">{app.icon}</span>}
              className="min-h-13 gap-3.5 rounded-lg px-2 py-1"
              disabled={!onAdd}
              onClick={() => onAdd?.(app.id)}
            />
          ))}
        </ListGroup>
      </SheetContent>
    </Sheet>
  );
}
