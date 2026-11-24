import type { ComponentProps, ReactNode } from "react";
import { Minus } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { AppTile } from "../AppTile.tsx";

export type HomeTileProps = Omit<ComponentProps<"button">, "children"> & {
  /** The app's name, under its icon. */
  label: string;
  /** The app's icon; decorative, since the label names the app. */
  icon: ReactNode;
  /** What waits in the app, such as "2 missed calls": a dot, said after the name. */
  badge?: string;
  /** Home is being edited: the tile offers its remove control and can be moved. */
  editing?: boolean;
  /** While editing, takes the tile off Home; left out while a change is being saved, so the control refuses. */
  onRemove?: () => void;
  /** Where the tile being dragged would land: just before or just after this one. */
  drop?: "before" | "after";
  /** This tile is the one being dragged. */
  dragging?: boolean;
};

/** One tile on Home: the app it opens, and while Home is being edited, its remove control and where a moved tile lands. */
export function HomeTile({ label, icon, badge, editing = false, onRemove, drop, dragging = false, className, ...props }: HomeTileProps) {
  return (
    <div className={cn("relative flex justify-center", dragging && "rounded-tile outline-2 outline-offset-2 outline-primary outline-dashed", className)}>
      {drop ? <span aria-hidden className={cn("absolute inset-y-2 w-1 rounded-full bg-primary", drop === "before" ? "-left-1.5" : "-right-1.5")} /> : null}
      <div className="relative">
        <AppTile label={label} icon={icon} badge={editing ? undefined : badge} className={cn(editing && "touch-none")} {...props} />
        {editing ? (
          <button
            type="button"
            aria-label={`Remove ${label}`}
            disabled={!onRemove}
            onClick={onRemove}
            className={cn(focusRing, "absolute -top-3.5 -left-3.5 flex size-11 items-center justify-center rounded-full disabled:opacity-50")}
          >
            <span aria-hidden className="flex size-6 items-center justify-center rounded-full bg-foreground text-background shadow-sm">
              <Minus className="size-4" />
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
