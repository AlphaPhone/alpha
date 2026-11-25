import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn, focusRing } from "../../lib/cn.ts";

export type FilesCardProps = {
  /** Whether the card is showing; the parent keeps it. */
  open: boolean;
  /** Called with `false` when Escape or a press on the dimmed page closes it. */
  onOpenChange: (open: boolean) => void;
  /** The card's heading and accessible name: what it asks or which item it is about. */
  title: string;
  /** A muted line under the heading, such as where an item came from or what going ahead does. */
  message?: ReactNode;
  /** The card's own content: a field, a list of folders or a list of facts. */
  children?: ReactNode;
  /** The words of the button that backs out; left out where `children` hold their own way out. */
  cancelLabel?: string;
  /** The words of the accent button that goes ahead, with `onConfirm`. */
  confirmLabel?: string;
  /** Leaves the accent button unpressable while what it would do cannot be done. */
  confirmDisabled?: boolean;
  /** Called by the accent button. */
  onConfirm?: () => void;
  className?: string;
};

/** The look of a pill a Files card goes ahead with: 44px, the accent filled. */
export const filesCardConfirm = cn(focusRing, "min-h-11 rounded-full bg-alpha px-4.5 text-base font-semibold text-alpha-foreground disabled:opacity-50");
/** The look of the plain words a Files card backs out with. */
export const filesCardCancel = cn(focusRing, "min-h-11 rounded-full px-4.5 text-base");

/**
 * A Files question or set of facts, as a card resting above Ask Alpha at the foot of the screen over a light scrim: a
 * serif heading, an optional muted line, its content, then Cancel and an accent pill at the end.
 */
export function FilesCard({ open, onOpenChange, title, message, children, cancelLabel, confirmLabel, confirmDisabled = false, onConfirm, className }: FilesCardProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-dialog bg-foreground/18 motion-safe:animate-fade dark:bg-background/18" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn("fixed inset-x-4 bottom-30 z-dialog mx-auto max-h-3/4 max-w-sm overflow-y-auto rounded-sheet bg-background px-5 pt-5.5 pb-6 text-foreground outline-none motion-safe:animate-rise", className)}
        >
          <DialogPrimitive.Title className="mb-1.5 font-display text-home-display leading-field font-light wrap-anywhere">{title}</DialogPrimitive.Title>
          {message ? <p className="mb-3 text-base leading-chat wrap-anywhere text-muted-foreground">{message}</p> : null}
          {children}
          {cancelLabel || confirmLabel ? (
            <div className="mt-4.5 flex flex-wrap justify-end gap-2.5">
              {cancelLabel ? <DialogPrimitive.Close className={filesCardCancel}>{cancelLabel}</DialogPrimitive.Close> : null}
              {confirmLabel ? <button type="button" className={filesCardConfirm} disabled={confirmDisabled} onClick={onConfirm}>{confirmLabel}</button> : null}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
