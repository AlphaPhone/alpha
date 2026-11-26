import { cn } from "../../lib/cn.ts";
import { ListGroup } from "../ListGroup.tsx";
import { ListRow } from "../ListRow.tsx";
import { Sheet, SheetContent } from "../Sheet.tsx";
import type { HomeTileItem } from "./HomeTileGrid.tsx";

export type AddToHomeSheetProps = {
  /** Add to Home is open; the parent keeps it. */
  open: boolean;
  /** The mounted Alpha frame when the sheet leaves the neighboring Ask pane available. */
  inFrame?: HTMLElement;
  /** Alpha's own apps this phone admits and Home does not hold, in Home order. */
  apps: readonly Omit<HomeTileItem, "badge">[];
  /** Puts an app back on Home; left out while a change is being saved, so the rows refuse. */
  onAdd?: (id: string) => void;
  /** Closes the sheet: Back, Escape or a press outside. */
  onClose: () => void;
};

/** The sheet, while Home is being edited, of Alpha's own apps that can be put back on Home. */
export function AddToHomeSheet({ open, inFrame, apps, onAdd, onClose }: AddToHomeSheetProps) {
  return (
    <Sheet open={open} modal={!inFrame} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent
        title="Add to Home"
        data-alpha-own-gesture=""
        overlayClassName="z-50 bg-foreground/25 motion-safe:animate-none dark:bg-background/25"
        frame={inFrame && { container: inFrame, backdrop: <div aria-hidden className="absolute inset-y-0 left-0 right-[calc(var(--alpha-home-ask-width)+--spacing(4))] z-20 bg-foreground/25 dark:bg-background/25" /> }}
        className={cn("bottom-0 z-50 gap-3 bg-background px-4 pt-4.5 pb-[calc(--spacing(6)+max(108px,calc(var(--alpha-dock-clearance,102px)+6px)))] text-foreground shadow-none before:hidden motion-safe:animate-none dark:shadow-none [&_h2]:px-1 [&_h2]:font-sans [&_h2]:text-date [&_h2]:leading-plain [&_h2]:font-semibold",
          inFrame && "absolute inset-x-auto left-0 right-[calc(var(--alpha-home-ask-width)+--spacing(4))] mx-0 max-h-[calc(100%_-_--spacing(4))] max-w-none pb-[max(--spacing(6),env(safe-area-inset-bottom))]")}
        onInteractOutside={inFrame ? (event) => {
          if (event.detail.originalEvent.type === "focusin") event.preventDefault();
        } : undefined}
        onCloseAutoFocus={inFrame ? (event) => {
          event.preventDefault();
          const active = inFrame.ownerDocument.activeElement;
          const trigger = inFrame.querySelector<HTMLElement>("[data-home-add-trigger]");
          if (active === inFrame.ownerDocument.body && !trigger?.closest("[inert]")) trigger?.focus();
        } : undefined}
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
