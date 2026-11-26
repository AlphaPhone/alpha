// spec/app/calendar/reminderReopen.md, "Story: Review reopening the selected reminder without an alert"; spec/app/calendar/editor.md, "Moving a completed reminder keeps its edited draft on screen until the owner approves rescheduling"
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from "@repo/ui";

interface ReminderReviewProps {
  open: boolean;
  title: string;
  details?: string;
  action: string;
  sending?: boolean;
  onApprove: () => void;
  onCancel: () => void;
  returnFocus?: () => HTMLElement | null;
}

/** A reviewed change to the selected Calendar reminder. */
export function ReminderReview({ open, title, details, action, sending, onApprove, onCancel, returnFocus }: ReminderReviewProps) {
  return (
    <Dialog open={open} onOpenChange={(shown) => { if (!shown && !sending) onCancel(); }}>
      <DialogContent className="inset-x-3 top-1/2 bottom-auto max-w-110 -translate-y-1/2 gap-0 rounded-action border border-border bg-background p-0"
        overlayClassName="bg-foreground/53 dark:bg-background/53"
        {...(details === undefined ? { "aria-describedby": undefined } : {})}
        onCloseAutoFocus={(event) => {
          const control = returnFocus?.();
          if (!control?.isConnected) return;
          event.preventDefault();
          control.focus();
        }}>
        <div className="px-4 py-4">
          <DialogTitle className="font-sans text-xl leading-normal font-bold">{title}</DialogTitle>
          <div className="mt-3">{details === undefined ? null : <DialogDescription className="mt-0 text-md leading-normal text-foreground">{details}</DialogDescription>}</div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
          <Button size="sm" variant="secondary" className="h-auto min-h-11 min-w-11 rounded-sm border border-border px-3.5 py-2.5 text-md leading-normal font-normal" disabled={sending} onClick={onCancel}>Cancel</Button>
          <Button size="sm" variant="secondary" className="h-auto min-h-11 min-w-11 rounded-sm border border-border px-3.5 py-2.5 text-md leading-normal font-normal" loading={sending}
            onClick={onApprove}>{action}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
