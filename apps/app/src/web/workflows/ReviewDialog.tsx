// spec/workflows/automations.md, "Allow another releases a held change only after the owner confirms it"; spec/workflows/lifecycle.md, "A change is reviewed before it is kept, never while a run is going, and an interrupted run is stopped first"
import type { ReactNode } from "react";
import { Button, Dialog, DialogContent, DialogTitle } from "../components/ui/index.ts";

export interface ReviewDialogProps {
  /** Whether the review is open. */
  open: boolean;
  /** What the owner is reviewing, as the dialog's title. */
  title: string;
  /** What will happen, as exactly as it will be sent. */
  children?: ReactNode;
  /** The confirming control's label. */
  confirm: string;
  /** A destructive change is confirmed with the destructive style. */
  destructive?: boolean;
  /** Whether the change may be confirmed now. */
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** One owner review before a change is kept and sent; closing it sends nothing. */
export function ReviewDialog({ open, title, children, confirm, destructive = false, disabled = false, onConfirm, onCancel }: ReviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onCancel())}>
      <DialogContent closeLabel="Cancel">
        <DialogTitle>{title}</DialogTitle>
        {children}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="lg" onClick={onCancel}>Cancel</Button>
          <Button variant={destructive ? "destructive" : "primary"} size="lg" disabled={disabled} onClick={onConfirm}>{confirm}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
