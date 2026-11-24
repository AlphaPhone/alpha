import { type ComponentProps, type ReactNode, useRef } from "react";
import { cn } from "../../lib/cn.ts";
import { AddToHomeSheet } from "./AddToHomeSheet.tsx";
import { HomeCardRow } from "./HomeCardRow.tsx";
import { HomeEditBar } from "./HomeEditBar.tsx";
import type { HomeNoticeMessage } from "./HomeNotice.tsx";
import { HomeTileGrid, type HomeTileItem, type HomeTileMove } from "./HomeTileGrid.tsx";

export type HomeScreenProps = {
  /** The day, as Home's one heading, such as "Tuesday 17". */
  date?: string;
  /** The cards drawn above the tiles, in order, each with its key; the row is not drawn without one. */
  cards?: readonly ReactNode[];
  /** The tiles shown, in Home's order; left out until what was saved has been read. */
  tiles?: readonly HomeTileItem[];
  /** Home is being edited. */
  editing?: boolean;
  /** Opens a tile's app; left out where nothing may be opened. */
  onOpenTile?: (id: string) => void;
  /** Starts editing from a long press on a tile; left out off the phone, before the tiles are read and under a layer. */
  onBeginEditing?: () => void;
  /** While editing, takes a tile off Home; left out while a change is being saved. */
  onRemoveTile?: (id: string) => void;
  /** While editing, moves a tile beside another; left out while a change is being saved. */
  onMoveTile?: (move: HomeTileMove) => void;
  /** Asks Android for its notifications, from a pull down on empty Home; left out unless Alpha is the launcher and Android is free. */
  onPullDown?: () => void;
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

const pullDistance = 56;

/** Empty space on Home that a pull down, mostly downward and far enough, turns into `onPull`. */
function PullZone({ onPull, className, ...props }: ComponentProps<"div"> & { onPull?: () => void }) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  if (!onPull) return <div className={className} {...props} />;
  return (
    <div
      className={cn("touch-none", className)}
      onPointerDown={(event) => {
        if (!event.isPrimary) return;
        startRef.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        const start = startRef.current;
        startRef.current = null;
        const down = start ? event.clientY - start.y : 0;
        if (start && down >= pullDistance && down > Math.abs(event.clientX - start.x)) onPull();
      }}
      onPointerCancel={() => {
        startRef.current = null;
      }}
      {...props}
    />
  );
}

/**
 * Home: the day, its cards and the owner's tiles; while editing, the edit bar and Add to Home. A pull down on its
 * empty space asks Android for its notifications.
 * @model spec/app/home/index.md
 */
export function HomeScreen({
  date, cards = [], tiles, editing = false, onOpenTile, onBeginEditing, onRemoveTile, onMoveTile, onPullDown,
  onShowHidden, onDone, notice, adding = false, hidden = [], onAddToHome, onCloseAdding = () => undefined, className,
}: HomeScreenProps) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-background text-base text-foreground", className)}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-[env(safe-area-inset-top)] pb-[calc(--spacing(26)+env(safe-area-inset-bottom))]">
        <PullZone onPull={onPullDown} className="px-6 pt-8 pb-4">
          <h1 className={cn("font-display text-4xl font-light", !date && "sr-only")}>{date ?? "Home"}</h1>
        </PullZone>
        {editing ? <HomeEditBar onShowHidden={onShowHidden} onDone={onDone} notice={notice} className="pb-4" /> : null}
        {cards.length > 0 ? <HomeCardRow>{cards}</HomeCardRow> : null}
        <PullZone onPull={onPullDown} className="min-h-8 flex-1" />
        {tiles ? (
          <HomeTileGrid
            tiles={tiles}
            editing={editing}
            onOpen={onOpenTile}
            onBeginEditing={onBeginEditing}
            onRemove={onRemoveTile}
            onMove={onMoveTile}
            className="pt-4"
          />
        ) : (
          <div aria-busy className="min-h-24" />
        )}
      </div>
      <AddToHomeSheet open={adding} apps={hidden} onAdd={onAddToHome} onClose={onCloseAdding} />
    </div>
  );
}
