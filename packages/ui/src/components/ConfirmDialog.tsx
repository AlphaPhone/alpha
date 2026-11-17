import type { ReactNode } from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "../lib/cn.ts";
import { dialogPanel, overlay, surfaceDescription, surfaceTitle } from "../lib/styles.ts";
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

/** A question asked before something that matters is done, as an alert dialog: one button goes ahead, the other, focused first, backs out. */
export function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel = "Cancel", destructive = false, loading = false, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next && !loading) onCancel(); }}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className={cn(overlay, "z-dialog")} />
        <AlertDialogPrimitive.Content className={dialogPanel} {...(children ? {} : { "aria-describedby": undefined })}>
          <AlertDialogPrimitive.Title className={surfaceTitle}>{title}</AlertDialogPrimitive.Title>
          {children ? <AlertDialogPrimitive.Description className={cn(surfaceDescription, "-mt-2")}>{children}</AlertDialogPrimitive.Description> : null}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="secondary" disabled={loading}>{cancelLabel}</Button>
            </AlertDialogPrimitive.Cancel>
            <Button variant={destructive ? "destructive" : "primary"} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
