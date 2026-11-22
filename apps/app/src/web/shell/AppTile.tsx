// spec/shell/gestures.md, "Story: Arrange Home with my fingers"
import { Minus, type LucideIcon } from "lucide-react";
import type { PointerEvent } from "react";
import { cn, focusRing } from "../lib/cn.ts";

/** One tile's identity and look: an Alpha app's icon, or an installed app's own image. */
export interface TileFace {
  key: string;
  label: string;
  icon?: LucideIcon;
  image?: string;
  /** A small dot for unread items. */
  badge?: boolean;
  /** Secondary text that tells same-named entries apart. */
  detail?: string;
}

/** What a tile reports to its grid; the grid turns pointers into gestures. */
export interface TileHandlers {
  onPointerDown: (event: PointerEvent<HTMLButtonElement>, key: string, onRemove: boolean) => void;
  onContextMenu: (key: string) => void;
  onActivate: (key: string, onRemove: boolean, keyboard: boolean) => void;
  onKey: (key: string, pressed: string) => void;
}

export interface AppTileProps extends TileHandlers {
  face: TileFace;
  /** Home's edit mode: the tile wiggles and shows its minus. */
  editing?: boolean;
  /** The tile is being dragged, and by how far. */
  offset?: { x: number; y: number };
  /** The installed entry is being opened. */
  launching?: boolean;
}

/** A Home tile or library entry: one target that opens, holds or, in edit mode, removes and moves. */
export function AppTile({ face, editing = false, offset, launching = false, onPointerDown, onContextMenu, onActivate, onKey }: AppTileProps) {
  const Icon = face.icon;
  return (
    <button
      type="button"
      data-alpha-tile={face.key}
      data-alpha-focus={`tile:${face.key}`}
      aria-label={editing ? `Remove ${face.label} from Home` : face.label}
      aria-busy={launching || undefined}
      aria-description={face.detail || undefined}
      onPointerDown={(event) => onPointerDown(event, face.key, (event.target as Element).closest("[data-alpha-tile-remove]") !== null)}
      onContextMenu={(event) => { event.preventDefault(); onContextMenu(face.key); }}
      onClick={(event) => onActivate(face.key, (event.target as Element).closest("[data-alpha-tile-remove]") !== null, event.detail === 0)}
      onKeyDown={(event) => onKey(face.key, event.key)}
      style={offset ? { translate: `${offset.x}px ${offset.y}px` } : undefined}
      className={cn(
        focusRing,
        "group relative flex min-h-24 flex-col items-center gap-2 rounded-lg p-2 text-center select-none touch-manipulation [-webkit-tap-highlight-color:transparent]",
        editing && "touch-none motion-safe:animate-pulse",
        offset && "z-10 shadow-lg",
      )}
    >
      <span className="relative flex size-14 items-center justify-center rounded-xl bg-secondary text-secondary-foreground transition-opacity ease-standard group-active:[&>*]:opacity-55 motion-reduce:transition-none">
        {face.image ? <img alt="" src={face.image} className="size-14 rounded-xl" /> : Icon ? <Icon aria-hidden className="size-7" /> : null}
        {face.badge && !editing && <span aria-hidden className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-primary" />}
        {editing && (
          <span data-alpha-tile-remove aria-hidden className="absolute -top-1.5 -left-1.5 flex size-6 items-center justify-center rounded-full bg-foreground text-background after:absolute after:-inset-2.5">
            <Minus className="size-3.5" />
          </span>
        )}
      </span>
      <span className="line-clamp-2 text-sm leading-tight break-words">{face.label}</span>
      {face.detail && <span className="line-clamp-1 text-xs text-muted-foreground">{face.detail}</span>}
    </button>
  );
}
