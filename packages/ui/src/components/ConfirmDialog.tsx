import type { ReactNode } from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "../lib/cn.ts";
import { aboveDock, overlay, sheetHandle, sheetPanel, surfaceTitle } from "../lib/styles.ts";
import { Button } from "./Button.tsx";

export type ConfirmDialogProps = {
  /** Whether the question is being asked; the parent keeps it. */
  open: boolean;
  /** The question, as the dialog's heading. */
  title: string;
  /** What going ahead does, where the title leaves it open. */
  children?: ReactNode;
  /** The words on the button that goes ahead. */
  confirmLabel: string;
  /** The words on the button that backs out. */
  cancelLabel?: string;
  /** Marks going ahead as something that cannot be taken back. */
  destructive?: boolean;
  /** While the work `onConfirm` started is in flight: the confirm button spins, and nothing backs out or presses it again. */
  loading?: boolean;
  /** Called by the button that goes ahead; the parent then closes the dialog, at once or when the work is done. */
  onConfirm: () => void;
  /** Called by the cancel button and Escape; a press outside does not back out. */
  onCancel: () => void;
};

/** A question asked before something that matters is done, as an alert dialog in a bottom sheet: one button goes ahead, the other, focused first, backs out. */
export function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel = "Cancel", destructive = false, loading = false, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next && !loading) onCancel(); }}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className={cn(overlay, "z-dialog", aboveDock)} />
        <AlertDialogPrimitive.Content className={cn(sheetPanel, aboveDock, sheetHandle, "z-dialog overflow-y-auto bg-card px-6 pt-7.5 pb-[max(--spacing(11),env(safe-area-inset-bottom))] text-card-foreground before:bg-muted-foreground/45")} {...(children ? {} : { "aria-describedby": undefined })}>
          <AlertDialogPrimitive.Title className={surfaceTitle}>{title}</AlertDialogPrimitive.Title>
          {children ? <AlertDialogPrimitive.Description className="mt-1.5 text-sm text-muted-foreground wrap-anywhere">{children}</AlertDialogPrimitive.Description> : null}
          <div className="mt-6 flex gap-2.5 *:h-13 *:flex-1">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="secondary" disabled={loading}>{cancelLabel}</Button>
            </AlertDialogPrimitive.Cancel>
            <Button className={destructive ? "bg-foreground text-background hover:bg-foreground/90 active:bg-foreground/80" : undefined} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
