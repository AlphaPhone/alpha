import type { ReactNode, Ref } from "react";
import { cn } from "../../lib/cn.ts";
import { dockClearance } from "../../lib/styles.ts";
import { AddToHomeSheet } from "./AddToHomeSheet.tsx";
import { HomeCardRow } from "./HomeCardRow.tsx";
import { HomeEditBar } from "./HomeEditBar.tsx";
import type { HomeNoticeMessage } from "./HomeNotice.tsx";
import { HomeTileGrid, type HomeTileItem, type HomeTileMove } from "./HomeTileGrid.tsx";
import type { LauncherHold } from "./launcherPress.ts";

export type HomeScreenProps = {
  /** The cards drawn above the tiles, in order, each with its key; the row is not drawn without one. */
  cards?: readonly ReactNode[];
  /** The tiles shown, in Home's order; left out until what was saved has been read. */
  tiles?: readonly HomeTileItem[];
  /** Home is being edited. */
  editing?: boolean;
  /** Another launcher surface is over Home. */
  covered?: boolean;
  /** Opens a tile's app; left out where nothing may be opened. */
  onOpenTile?: (id: string) => void;
  /** Starts editing from a long press on a tile; left out off the phone, before the tiles are read and under a layer. */
  onBeginEditing?: () => void;
  /** Schedules and cancels a stationary press on a tile. */
  hold?: LauncherHold;
  /** While editing, takes a tile off Home; left out while a change is being saved. */
  onRemoveTile?: (id: string) => void;
  /** While editing, moves a tile beside another; left out while a change is being saved. */
  onMoveTile?: (move: HomeTileMove) => void;
  /** Opens the Apps drawer; left out off the phone and while Home is being edited. */
  onOpenDrawer?: () => void;
  /** The Home scroller where the launcher can listen for a pull when Android is free. */
  scrollRef?: Ref<HTMLDivElement>;
  /** Opens Add to Home; left out when it is open or nothing is left to add. */
  onShowHidden?: () => void;
  /** Ends editing. */
  onDone?: () => void;
  /** A failure told while Home is being edited, shown in the edit bar. */
  notice?: HomeNoticeMessage;
  /** Add to Home is open. */
  adding?: boolean;
  /** What Add to Home lists: Alpha's own apps this phone admits that Home does not hold. */
  hidden?: readonly Omit<HomeTileItem, "badge">[];
  /** Puts an app back on Home from Add to Home; left out while a change is being saved. */
  onAddToHome?: (id: string) => void;
  /** Closes Add to Home. */
  onCloseAdding?: () => void;
  className?: string;
};

/**
 * Home: the day's cards and the owner's tiles; while editing, the edit bar and Add to Home. A pull down on its
 * empty space asks Android for its notifications.
 * @model spec/app/home/index.md
 */
export function HomeScreen({
  cards = [], tiles, editing = false, covered = false, onOpenTile, onBeginEditing, hold, onRemoveTile, onMoveTile, onOpenDrawer, scrollRef,
  onShowHidden, onDone, notice, adding = false, hidden = [], onAddToHome, onCloseAdding = () => undefined, className,
}: HomeScreenProps) {
  return (
    <div inert={covered || undefined} className={cn("flex h-full min-h-0 flex-1 flex-col bg-background text-base text-foreground", className)}>
      <div ref={scrollRef} className={cn(dockClearance, "flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain")}>
        <div className="min-h-[calc(env(safe-area-inset-top)+--spacing(3))] shrink-0">
          <h1 className="sr-only">Home</h1>
        </div>
        {editing ? <HomeEditBar onShowHidden={onShowHidden} onDone={onDone} notice={notice} className="pb-3" /> : null}
        {cards.length > 0 ? <HomeCardRow>{cards}</HomeCardRow> : null}
        <div aria-hidden className="h-6 shrink-0" />
        {tiles ? (
          <HomeTileGrid
            tiles={tiles}
            editing={editing}
            onOpen={onOpenTile}
            onBeginEditing={onBeginEditing}
            hold={hold}
            onRemove={onRemoveTile}
            onMove={onMoveTile}
            onOpenDrawer={onOpenDrawer}
          />
        ) : (
          <div aria-busy className="min-h-24" />
        )}
        <div aria-hidden className="min-h-4 flex-1" />
      </div>
      <AddToHomeSheet open={adding} apps={hidden} onAdd={onAddToHome} onClose={onCloseAdding} />
    </div>
  );
}
