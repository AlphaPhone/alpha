import type { ComponentProps, ReactNode } from "react";
import { Minus } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { AppTile } from "../AppTile.tsx";
import { type LauncherHold, useLauncherPress } from "./launcherPress.ts";

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
  /** Schedules and cancels a stationary press on this tile. */
  hold?: LauncherHold;
  /** Opens Home editing after a stationary press or the context menu key. */
  onHold?: () => void;
};

/** One tile on Home: the app it opens, and while Home is being edited, its remove control. */
export function HomeTile({ label, icon, badge, editing = false, onRemove, hold, onHold, onClick, className, ...props }: HomeTileProps) {
  const activation = useLauncherPress(hold, onHold, onClick);
  return (
    <div data-home-cell="" className={cn("group/home-cell relative flex justify-center data-[home-dragging]:z-10", className)}>
      <div className="relative">
        <AppTile
          label={label}
          icon={icon}
          badge={editing ? undefined : badge}
          className={cn(editing && "touch-none *:first:animate-wiggle *:first:motion-reduce:animate-none *:first:group-data-[home-dragging]/home-cell:animate-none")}
          {...activation}
          {...props}
        />
        {editing ? (
          <button
            type="button"
            aria-label={`Remove ${label}`}
            disabled={!onRemove}
            onClick={onRemove}
            className={cn(focusRing, "absolute -top-4 -left-4 flex size-11 items-center justify-center rounded-full disabled:opacity-50")}
          >
            <span aria-hidden className="flex size-6 items-center justify-center rounded-full bg-foreground text-background">
              <Minus className="size-3.5" />
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
