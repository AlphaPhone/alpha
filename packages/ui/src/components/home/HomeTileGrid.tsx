import { type ComponentProps, type KeyboardEvent, type PointerEvent, type ReactNode, useRef, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import { AppTile } from "../AppTile.tsx";
import { HomeTile } from "./HomeTile.tsx";

/** One tile Home shows: one of Alpha's own apps or an installed app, named by the launcher's own id. */
export type HomeTileItem = {
  id: string;
  label: string;
  /** The app's icon; decorative. */
  icon: ReactNode;
  /** What waits in the app; given only for Phone, Messages and Inbox, and never while Home is being edited. */
  badge?: string;
};

/** A tile moved to just before, or with `behind` just after, the tile `onto`. */
export type HomeTileMove = { id: string; onto: string; behind: boolean };

export type HomeTileGridProps = Omit<ComponentProps<"nav">, "children"> & {
  /** The tiles shown, in Home's order. */
  tiles: readonly HomeTileItem[];
  /** Home is being edited: tiles are removed and moved, not opened. */
  editing?: boolean;
  /** Opens a tile's app; left out where nothing may be opened. */
  onOpen?: (id: string) => void;
  /** Starts editing, from a long press or the context menu key on a tile; left out where editing may not start. */
  onBeginEditing?: () => void;
  /** While editing, takes a tile off Home, by its control or Delete; left out while a change is being saved. */
  onRemove?: (id: string) => void;
  /** While editing, moves a tile, by dragging it onto another or with the arrow keys; left out while a change is being saved. */
  onMove?: (move: HomeTileMove) => void;
  /** Opens the Apps drawer from the tile after the others; left out where there is no drawer. */
  onOpenDrawer?: () => void;
};

/** The columns of a grid of app tiles: four on a phone, more on a wider screen, fewer with large text. */
export const tileColumns = "grid grid-cols-[repeat(auto-fill,minmax(max(calc(25%_-_.5px),3.875rem),1fr))] gap-y-6";

const steps: Record<string, -1 | 1> = { ArrowLeft: -1, ArrowRight: 1 };

const dropTarget = (event: PointerEvent, id: string): HomeTileMove | undefined => {
  const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-home-tile]");
  const onto = cell?.dataset.homeTile;
  if (!cell || !onto || onto === id) return undefined;
  const box = cell.getBoundingClientRect();
  return { id, onto, behind: event.clientX > box.left + box.width / 2 };
};

/**
 * Home's tiles and the Apps tile. While editing, a tile is dragged onto another, moved with the arrow keys and
 * removed with Delete; keyboard focus stays on the tile it moved.
 * @model spec/app/home/tiles.md
 */
export function HomeTileGrid({ tiles, editing = false, onOpen, onBeginEditing, onRemove, onMove, onOpenDrawer, className, ...props }: HomeTileGridProps) {
  const [drag, setDrag] = useState<{ id: string; over?: HomeTileMove } | null>(null);
  const movedRef = useRef<string | null>(null);

  const keys = (event: KeyboardEvent, index: number, id: string) => {
    const step = steps[event.key];
    const onto = step === undefined ? undefined : tiles[index + step];
    if (onto && onMove) {
      event.preventDefault();
      movedRef.current = id;
      onMove({ id, onto: onto.id, behind: step === 1 });
    } else if ((event.key === "Delete" || event.key === "Backspace") && onRemove) {
      event.preventDefault();
      onRemove(id);
    }
  };

  const dragging: ComponentProps<"nav"> = drag
    ? {
        onPointerMove: (event) => setDrag({ ...drag, over: dropTarget(event, drag.id) }),
        onPointerUp: () => {
          if (drag.over) onMove?.(drag.over);
          setDrag(null);
        },
        onPointerCancel: () => setDrag(null),
        onPointerLeave: () => setDrag(null),
      }
    : {};

  return (
    <nav
      aria-label="Apps on Home"
      className={cn(tileColumns, "px-4", className)}
      onBlur={(event) => {
        if (event.relatedTarget) movedRef.current = null;
      }}
      {...dragging}
      {...props}
    >
      {tiles.map((tile, index) => (
        <HomeTile
          key={tile.id}
          data-home-tile={tile.id}
          label={tile.label}
          icon={tile.icon}
          badge={tile.badge}
          editing={editing}
          aria-keyshortcuts={editing ? "ArrowLeft ArrowRight Delete" : undefined}
          dragging={drag?.id === tile.id}
          drop={drag?.over?.onto === tile.id ? (drag.over.behind ? "after" : "before") : undefined}
          ref={(button: HTMLButtonElement | null) => {
            if (button && movedRef.current === tile.id && document.activeElement !== button) button.focus();
          }}
          {...(editing
            ? {
                onRemove: onRemove && (() => onRemove(tile.id)),
                onKeyDown: (event) => keys(event, index, tile.id),
                onPointerDown: onMove && (() => setDrag({ id: tile.id })),
              }
            : {
                disabled: !onOpen,
                onClick: onOpen && (() => onOpen(tile.id)),
                onContextMenu: onBeginEditing && ((event) => {
                  event.preventDefault();
                  onBeginEditing();
                }),
              })}
        />
      ))}
      {onOpenDrawer && !editing ? <AppTile label="Apps" icon={<LayoutGrid className="size-7.5" />} aria-haspopup="dialog" onClick={onOpenDrawer} /> : null}
    </nav>
  );
}
