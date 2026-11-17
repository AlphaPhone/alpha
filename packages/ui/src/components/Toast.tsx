import type { ComponentProps } from "react";
import { cn, focusRing } from "../lib/cn.ts";

export type ToastRegionProps = Omit<ComponentProps<"div">, "role" | "aria-live">;
export type ToastProps = ComponentProps<"div"> & {
  /** Takes back what the notice reports; the Undo button is shown only with it. */
  onUndo?: () => void;
  /** The words on the Undo button. */
  undoLabel?: string;
};

/**
 * Where notices appear, over the top of the screen: render it once in the app shell, empty, and put each `Toast` in
 * it, so a screen reader announces the words that arrive. It stays heard and pressable while a sheet or a dialog is
 * open, though focus stays inside that sheet or dialog.
 */
export function ToastRegion({ className, ...props }: ToastRegionProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("pointer-events-none fixed inset-x-4 top-[calc(env(safe-area-inset-top)+--spacing(3))] z-toast flex flex-col items-center gap-2", className)}
      {...props}
    />
  );
}

/** A short notice about what just happened, inside a `ToastRegion`. It keeps no time: it shows for as long as its parent renders it. */
export function Toast({ onUndo, undoLabel = "Undo", className, children, ...props }: ToastProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex min-h-12 w-fit max-w-sm items-center gap-1 rounded-tile bg-foreground py-0.5 pl-5 text-sm font-medium text-background shadow-md motion-safe:animate-drop",
        onUndo ? "pr-0.5" : "pr-5",
        className,
      )}
      {...props}
    >
      <span className="min-w-0 flex-1 py-2">{children}</span>
      {onUndo ? (
        <button type="button" onClick={onUndo} className={cn(focusRing, "min-h-11 min-w-11 shrink-0 rounded-full px-4 font-semibold transition-colors duration-fast ease-standard hover:bg-background/20 focus-visible:-outline-offset-focus focus-visible:outline-background active:bg-background/30")}>
          {undoLabel}
        </button>
      ) : null}
    </div>
  );
}
