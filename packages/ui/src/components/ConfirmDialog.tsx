import type { ReactNode } from "react";
import { Button } from "./Button.tsx";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "./Dialog.tsx";

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
  /** Called by the button that goes ahead; the parent then closes the dialog. */
  onConfirm: () => void;
  /** Called by the cancel button, Escape and a press outside. */
  onCancel: () => void;
};

/** A question asked before something that matters is done: one button goes ahead, the other backs out. */
export function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel = "Cancel", destructive = false, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent {...(children ? {} : { "aria-describedby": undefined })}>
        <DialogTitle>{title}</DialogTitle>
        {children ? <DialogDescription>{children}</DialogDescription> : null}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <DialogClose asChild>
            <Button variant="secondary">{cancelLabel}</Button>
          </DialogClose>
          <Button variant={destructive ? "destructive" : "primary"} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
