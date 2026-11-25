import type { ReactNode } from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn, focusRing } from "../../lib/cn.ts";

export type BrowserReviewProps = {
  /** Whether the review is open; the parent keeps it. */
  open: boolean;
  /** What is being reviewed, as its heading. */
  title: string;
  /** What going ahead does. */
  children?: ReactNode;
  /** The words on the button that goes ahead. */
  confirmLabel: string;
  /** The words on the button that backs out. */
  cancelLabel?: string;
  /** Sets going ahead apart from backing out, for something that removes or replaces what is kept. */
  destructive?: boolean;
  /** Called by the button that goes ahead. */
  onConfirm: () => void;
  /** Called by the cancel button and Escape. */
  onCancel: () => void;
};

const action = cn(focusRing, "min-h-11 min-w-11 rounded-sm border border-border bg-secondary px-3.5 py-2.5 text-md leading-normal text-foreground");

/** The Browser's review before an operation on the phone's browsing data: its details, then Cancel, focused first, and the operation. */
export function BrowserReview({ open, title, children, confirmLabel, cancelLabel = "Cancel", destructive = false, onConfirm, onCancel }: BrowserReviewProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-dialog bg-foreground/53 dark:bg-background/53" />
        <AlertDialogPrimitive.Content {...(children ? {} : { "aria-describedby": undefined })}
          className="fixed top-1/2 left-1/2 z-dialog flex max-h-[calc(100dvh-1.5rem)] w-110 max-w-[calc(100vw-1.5rem)] -translate-1/2 flex-col overflow-hidden rounded-action border border-border bg-background text-md leading-normal text-foreground outline-none">
          <section aria-label="Operation details" className="min-h-0 overflow-auto p-4 wrap-anywhere">
            <AlertDialogPrimitive.Title className="mb-3 text-xl leading-normal font-bold">{title}</AlertDialogPrimitive.Title>
            {children ? <AlertDialogPrimitive.Description className="whitespace-pre-wrap">{children}</AlertDialogPrimitive.Description> : null}
          </section>
          <footer className="flex shrink-0 flex-wrap gap-2 border-t border-border px-4 py-3">
            <AlertDialogPrimitive.Cancel className={action}>{cancelLabel}</AlertDialogPrimitive.Cancel>
            <button type="button" className={cn(action, destructive && "border-current font-bold")} onClick={onConfirm}>{confirmLabel}</button>
          </footer>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
