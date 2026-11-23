// spec/shell/toasts.md, "Story: Read what just happened, at my own pace"; spec/shell/toasts.md, "A toast leaves when its time is up, its Undo ran or the owner dismissed it, and the next one takes its place"; spec/shell/toasts.md, "A persistent notice is listed until dismissed, at most three, each once"
import { X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Toasts } from "../../../gen/shell__toasts.ts";
import { cn, focusRing } from "../lib/cn.ts";
import { HOST_CHROME } from "../browser/measure.ts";

/** The toast region: the shown toast, where it lives and its hold, release and Undo. */
export interface ToastRegionProps {
  toasts: Toasts;
  /** The topmost open modal hosts the toast instead of the page, so it is seen and announced above it. */
  inDialog?: boolean;
  onHold: () => void;
  onRelease: () => void;
  onAction: () => void;
  /** The owner tapped the message, or pressed Enter or Space on it: the shown toast closes without its Undo. */
  onDismiss: () => void;
}

/**
 * The shell's live region: one toast at a time, polite for news and assertive for a failure, held while focus or a pointer is in it.
 * @model spec/shell/toasts.md
 */
export function ToastRegion({ toasts, inDialog = false, onHold, onRelease, onAction, onDismiss }: ToastRegionProps) {
  const shown = toasts.shown;
  // spec/shell/toasts.md, "Inside a modal dialog the toast lives in the topmost dialog": a modal dialog or sheet hides and
  // inerts everything outside it, so the toast is drawn inside the topmost open one, where it is announced and can be tapped.
  const [host, setHost] = useState<Element | null>(null);
  useLayoutEffect(() => {
    if (!inDialog) {
      setHost(null);
      return;
    }
    const open = document.querySelectorAll('[role="dialog"][data-state="open"],[role="alertdialog"][data-state="open"]');
    setHost(open.item(open.length - 1));
  }, [inDialog, toasts.seq]);
  // Where focus came from when it entered the toast, so it returns there when the toast it was in closes.
  const origin = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const from = origin.current;
    if (from === null) return;
    const active = document.activeElement;
    const dropped = active === null || active === document.body;
    if (dropped && from.isConnected) from.focus();
    if (dropped || shown.message === "") origin.current = null;
  }, [toasts.seq, shown.message]);
  const drawn = (
    <div
      data-alpha-toast
      aria-live={shown.failure ? "assertive" : "polite"}
      aria-atomic="true"
      className={cn("pointer-events-none z-50 flex justify-center px-3", inDialog ? "sticky top-0" : "absolute inset-x-0")}
      style={inDialog ? undefined : { top: "calc(var(--alpha-header-clearance, 0px) + 0.5rem)" }}
      onPointerEnter={onHold}
      onPointerLeave={onRelease}
      onFocus={(event) => {
        if (origin.current === null && event.relatedTarget instanceof HTMLElement && !event.currentTarget.contains(event.relatedTarget)) origin.current = event.relatedTarget;
        onHold();
      }}
      onBlur={(event) => {
        // Focus the owner moved elsewhere stays there; only focus the closing toast dropped goes back.
        if (event.relatedTarget instanceof Element && !event.currentTarget.contains(event.relatedTarget)) origin.current = null;
        onRelease();
      }}
    >
      {shown.message !== "" && (
        <div {...{ [HOST_CHROME]: "" }} className="pointer-events-auto flex min-h-12 max-w-full items-center gap-3 rounded-xl bg-foreground py-2 pr-1 pl-4 text-background shadow-lg">
          <button type="button" aria-label={`${shown.message} Dismiss`} onClick={onDismiss}
            className={cn(focusRing, "min-h-10 min-w-0 flex-1 break-words rounded-lg text-left")}>
            {shown.message}
          </button>
          {shown.undo !== "" && (
            <button type="button" onClick={onAction} className={cn(focusRing, "min-h-10 shrink-0 rounded-full px-4 font-mono text-xs uppercase tracking-widest")}>
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
  return host === null ? drawn : createPortal(drawn, host);
}

/** The persistent notices listed until dismissed. */
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
        <li key={notice} data-alpha-persistent-notice {...{ [HOST_CHROME]: "" }} className="pointer-events-auto flex items-start gap-3 rounded-lg bg-card p-3 text-card-foreground">
          <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-warn" />
          <span className="flex-1 text-sm">{notice}</span>
          <button type="button" aria-label={`Dismiss: ${notice}`} onClick={() => onDismiss(notice)} className={cn(focusRing, "-m-2 flex size-12 shrink-0 items-center justify-center rounded-md")}>
            <X aria-hidden className="size-5" />
          </button>
        </li>
      ))}
    </ul>
  );
}
