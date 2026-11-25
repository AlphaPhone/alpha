import type { ReactNode } from "react";
import { cn, focusRing } from "../../lib/cn.ts";

/** One thing to do with what is chosen; left without `onPress` while it cannot be done. */
export interface FilesSelectionAction {
  label: string;
  icon: ReactNode;
  onPress?: (() => void) | undefined;
}

export type FilesSelectionBarProps = {
  /** What can be done with the chosen items, in order. */
  actions: readonly FilesSelectionAction[];
  className?: string;
};

/** The bar that floats over the foot of a folder while items are chosen: Share, Move, Rename, Delete. */
export function FilesSelectionBar({ actions, className }: FilesSelectionBarProps) {
  return (
    <div role="toolbar" aria-label="Selection actions" className={cn("absolute inset-x-3 bottom-24 z-20 flex justify-around rounded-sheet bg-background p-1.5 shadow-md ring-1 ring-border", className)}>
      {actions.map(({ label, icon, onPress }) => (
        <button key={label} type="button" disabled={!onPress} onClick={onPress}
          className={cn(focusRing, "flex min-h-13 min-w-15 flex-col items-center justify-center gap-0.5 rounded-tile text-xs active:bg-accent disabled:opacity-35 [&_svg]:size-5")}>
          <span aria-hidden className="flex">{icon}</span>{label}
        </button>
      ))}
    </div>
  );
}
