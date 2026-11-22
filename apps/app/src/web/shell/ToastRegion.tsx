// spec/shell/toasts.md, "Story: Read what just happened, at my own pace"; spec/shell/toasts.md, "A persistent notice is listed until dismissed, at most three, each once"
import { X } from "lucide-react";
import type { Toasts } from "../../../gen/shell__toasts.ts";
import { cn, focusRing } from "../lib/cn.ts";

export interface ToastRegionProps {
  toasts: Toasts;
  /** The topmost open modal hosts the toast instead of the page, so it is seen and announced above it. */
  inDialog?: boolean;
  onHold: () => void;
  onRelease: () => void;
  onAction: () => void;
}

/**
 * The shell's live region: one toast at a time, polite for news and assertive for a failure, held while focus or a pointer is in it.
 * @model spec/shell/toasts.md
 */
export function ToastRegion({ toasts, inDialog = false, onHold, onRelease, onAction }: ToastRegionProps) {
  const shown = toasts.shown;
  return (
    <div
      data-alpha-toast
      aria-live={shown.failure ? "assertive" : "polite"}
      aria-atomic="true"
      className={cn("pointer-events-none z-50 flex justify-center px-3", inDialog ? "sticky top-0" : "absolute inset-x-0")}
      style={inDialog ? undefined : { top: "calc(var(--alpha-header-clearance, 0px) + 0.5rem)" }}
      onPointerEnter={onHold}
      onPointerLeave={onRelease}
      onFocus={onHold}
      onBlur={onRelease}
    >
      {shown.message !== "" && (
        <div className="pointer-events-auto flex min-h-12 max-w-full items-center gap-3 rounded-xl bg-foreground py-2 pr-1 pl-4 text-background shadow-lg">
          <span className="min-w-0 flex-1 break-words">{shown.message}</span>
          {shown.action !== "" && (
            <button type="button" onClick={onAction} className={cn(focusRing, "min-h-10 shrink-0 rounded-full px-4 font-mono text-xs uppercase tracking-widest")}>
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export interface NoticesSlotProps {
  notices: readonly string[];
  onDismiss: (message: string) => void;
}

/** The notices slot: what the owner must not miss, listed without a timer until dismissed. */
export function NoticesSlot({ notices, onDismiss }: NoticesSlotProps) {
  if (notices.length === 0) return null;
  return (
    <ul aria-label="Notices" className="flex flex-col gap-2 px-3">
      {notices.map((notice) => (
        <li key={notice} data-alpha-persistent-notice className="flex items-start gap-3 rounded-lg bg-card p-3 text-card-foreground">
          <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-warn" />
          <span className="flex-1 text-sm">{notice}</span>
          <button type="button" aria-label={`Dismiss: ${notice}`} onClick={() => onDismiss(notice)} className={cn(focusRing, "rounded-md p-1")}>
            <X aria-hidden className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
