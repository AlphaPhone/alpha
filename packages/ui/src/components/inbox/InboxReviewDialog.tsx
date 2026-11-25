import type { ReactNode } from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn, focusRing } from "../../lib/cn.ts";

export type InboxReviewDialogProps = {
  /** Whether the question is being asked; the parent keeps it. */
  open: boolean;
  /** The question, as the dialog's heading and name. */
  title: string;
  /** What the owner is told under the question. */
  children?: ReactNode;
  /** The words on the button that backs out. */
  noLabel?: string;
  /** The words on the button that goes ahead. */
  yesLabel?: string;
  /** Goes ahead; left out, only backing out is offered. */
  onYes?: () => void;
  /** The work `onYes` started is in flight: nothing presses until it ends. */
  busy?: boolean;
  /** Backs out: the No button and Escape. */
  onNo: () => void;
};

const choice = cn(focusRing, "min-h-11 rounded-lg px-4 py-2.5 disabled:opacity-50");

/**
 * A question Inbox asks before it changes mail: a card low on the dimmed page with No and Yes.
 *
 * @model spec/app/inbox/sending.md
 */
export function InboxReviewDialog({ open, title, children, noLabel = "No", yesLabel = "Yes", onYes, busy = false, onNo }: InboxReviewDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next && !busy) onNo(); }}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-dialog bg-foreground/45 motion-safe:animate-fade dark:bg-background/70" />
        <AlertDialogPrimitive.Content
          {...(children ? {} : { "aria-describedby": undefined })}
          className="fixed inset-x-4 bottom-18 z-dialog mx-auto max-h-[calc(100dvh-5.5rem)] max-w-md overflow-auto rounded-tile bg-background p-5 text-foreground outline-none motion-safe:animate-rise"
        >
          <AlertDialogPrimitive.Title className="text-xl leading-tight font-bold">{title}</AlertDialogPrimitive.Title>
          {children ? <AlertDialogPrimitive.Description asChild><div className="mt-3 text-base">{children}</div></AlertDialogPrimitive.Description> : null}
          <div className="mt-4 flex gap-2">
            <AlertDialogPrimitive.Cancel disabled={busy} className={cn(choice, "bg-secondary text-secondary-foreground")}>{noLabel}</AlertDialogPrimitive.Cancel>
            {onYes ? <button type="button" disabled={busy} aria-busy={busy || undefined} onClick={onYes} className={cn(choice, "bg-foreground text-background")}>{yesLabel}</button> : null}
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
