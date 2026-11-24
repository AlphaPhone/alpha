import { type ComponentProps, type KeyboardEvent, type PointerEvent, type ReactNode, useRef } from "react";
import { LayoutGrid } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import { AppTile } from "../AppTile.tsx";
import { HomeTile } from "./HomeTile.tsx";
import { type LauncherHold, launcherPressSlop } from "./launcherPress.ts";

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
  /** Schedules and cancels a stationary press on a tile. */
  hold?: LauncherHold;
  /** While editing, takes a tile off Home, by its control or Delete; left out while a change is being saved. */
  onRemove?: (id: string) => void;
  /** While editing, moves a tile, by dragging it onto another or with the arrow keys; left out while a change is being saved. */
  onMove?: (move: HomeTileMove) => void;
  /** Opens the Apps drawer from the tile after the others; left out where there is no drawer. */
  onOpenDrawer?: () => void;
};

/** The columns of a grid of app tiles: four on a phone, more on a wider screen, fewer with large text. */
export const tileColumns = "grid grid-cols-[repeat(auto-fill,minmax(max(calc(25%_-_.5px),3.875rem),1fr))] gap-y-6";

const steps: Partial<Record<string, -1 | 1>> = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };

type Drag = {
  readonly id: string;
  readonly pointer: number;
  readonly cell: HTMLElement;
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  moved: boolean;
};

/**
 * Home's tiles and the Apps tile. While editing, a tile is dragged onto another, moved with the arrow keys and
 * removed with Delete; keyboard focus stays on the tile it moved.
 * @model spec/app/home/tiles.md
 */
export function HomeTileGrid({ tiles, editing = false, onOpen, onBeginEditing, hold, onRemove, onMove, onOpenDrawer, className, ...props }: HomeTileGridProps) {
  const dragging = useRef<Drag | undefined>(undefined);
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

  const clearDrag = () => {
    const drag = dragging.current;
    if (!drag) return;
    dragging.current = undefined;
    drag.cell.style.removeProperty("transform");
    drag.cell.removeAttribute("data-home-dragging");
  };
  const startDrag = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    if (!event.isPrimary || event.button !== 0) return;
    clearDrag();
    const cell = event.currentTarget.closest<HTMLElement>("[data-home-cell]");
    if (!cell) return;
    const width = cell.getBoundingClientRect().width;
    dragging.current = { id, pointer: event.pointerId, cell, x: event.clientX, y: event.clientY, scale: width > 0 ? cell.offsetWidth / width : 1, moved: false };
  };
  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = dragging.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    if (!editing || !onMove || drag.cell.closest("[inert]")) { clearDrag(); return; }
    const dx = (event.clientX - drag.x) * drag.scale;
    const dy = (event.clientY - drag.y) * drag.scale;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) <= launcherPressSlop) return;
      if (event.nativeEvent.isTrusted) event.currentTarget.setPointerCapture(event.pointerId);
      drag.moved = true;
      drag.cell.setAttribute("data-home-dragging", "");
    }
    drag.cell.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  };
  const endDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = dragging.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    clearDrag();
    if (!drag.moved || !editing || !onMove || drag.cell.closest("[inert]")) return;
    event.preventDefault();
    event.stopPropagation();
    const grid = event.currentTarget;
    const target = grid.ownerDocument.elementsFromPoint(event.clientX, event.clientY)
      .map((node) => node.closest<HTMLElement>("[data-home-cell]"))
      .find((cell) => cell && cell !== drag.cell && grid.contains(cell));
    const onto = target?.querySelector<HTMLElement>("[data-home-tile]")?.dataset.homeTile;
    const fromIndex = tiles.findIndex((tile) => tile.id === drag.id);
    const toIndex = tiles.findIndex((tile) => tile.id === onto);
    if (onto && fromIndex >= 0 && toIndex >= 0) onMove({ id: drag.id, onto, behind: toIndex > fromIndex });
  };
  const cancelDrag = (event: PointerEvent<HTMLElement>) => {
    if (dragging.current?.pointer === event.pointerId) clearDrag();
  };

  return (
    <nav
      aria-label="Apps on Home"
      className={cn(tileColumns, "px-4", className)}
      onBlur={(event) => {
        if (event.relatedTarget) movedRef.current = null;
      }}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={cancelDrag}
      onPointerLeave={(event) => { if (!dragging.current?.moved) cancelDrag(event); }}
      onLostPointerCapture={(event) => { if (event.target === event.currentTarget) cancelDrag(event); }}
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
          aria-keyshortcuts={editing ? "ArrowLeft ArrowRight ArrowUp ArrowDown Delete" : undefined}
          ref={(button: HTMLButtonElement | null) => {
            if (button && movedRef.current === tile.id && document.activeElement !== button) button.focus();
          }}
          {...(editing
            ? {
                onRemove: onRemove && (() => onRemove(tile.id)),
                onKeyDown: (event) => keys(event, index, tile.id),
                onPointerDown: onMove && ((event) => startDrag(event, tile.id)),
                "data-alpha-own-gesture": "",
              }
            : {
                disabled: !onOpen,
                onClick: onOpen && (() => onOpen(tile.id)),
                hold,
                onHold: onBeginEditing,
              })}
        />
      ))}
      {onOpenDrawer && !editing ? <AppTile label="Apps" icon={<LayoutGrid className="size-7.5" />} aria-haspopup="dialog" onClick={onOpenDrawer} /> : null}
    </nav>
  );
}
