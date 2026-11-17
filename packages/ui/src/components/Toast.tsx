import type { ComponentProps } from "react";
import { cn, focusRing } from "../lib/cn.ts";

export type ToastProps = Omit<ComponentProps<"div">, "role"> & {
  /** Takes back what the notice reports; the Undo button is shown only with it. */
  onUndo?: () => void;
  /** The words on the Undo button. */
  undoLabel?: string;
};

/** A short notice over the screen about what just happened. It keeps no time: it shows for as long as its parent renders it. */
export function Toast({ onUndo, undoLabel = "Undo", className, children, ...props }: ToastProps) {
  return (
    <div
      role="status"
      className={cn(
        "fixed inset-x-4 top-[calc(env(safe-area-inset-top)+--spacing(3))] z-toast mx-auto flex min-h-12 w-fit max-w-sm items-center gap-1 rounded-full bg-foreground py-0.5 pl-5 text-sm font-medium text-background shadow-md motion-safe:animate-drop",
        onUndo ? "pr-0.5" : "pr-5",
        className,
      )}
      {...props}
    >
      <span className="min-w-0 flex-1 py-2">{children}</span>
      {onUndo ? (
        <button type="button" onClick={onUndo} className={cn(focusRing, "min-h-11 min-w-11 shrink-0 rounded-full px-4 font-semibold transition-colors duration-fast ease-standard hover:bg-background/20 focus-visible:ring-background active:bg-background/30")}>
          {undoLabel}
        </button>
      ) : null}
    </div>
  );
}
