import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn, focusRing } from "../../lib/cn.ts";
import { overlay } from "../../lib/styles.ts";

export type InboxLinkReviewProps = {
  /** Whether the review is up; the parent keeps it. */
  open: boolean;
  /** Where the link goes: an https address without credentials in it, shown whole under its host. */
  destination: string;
  /** What the link's own text names, when that is another destination: a warning is shown with it. */
  claimed?: string;
  /** Opens the link in Alpha's Browser, once; the review then closes. */
  onOpen: () => void;
  /** Closes the review without opening anything. */
  onClose: () => void;
};

const hostOf = (destination: string) => {
  try {
    return new URL(destination).hostname;
  } catch {
    return destination;
  }
};

const choice = cn(focusRing, "min-h-11 min-w-11 rounded-sm border border-border bg-secondary px-3.5 py-2.5 text-secondary-foreground");

/**
 * The address a link in a message leads to, its host and then the whole address, shown before anything opens, with a
 * warning when the words of the link name somewhere else.
 *
 * @model spec/app/inbox/message.md
 */
export function InboxLinkReview({ open, destination, claimed, onOpen, onClose }: InboxLinkReviewProps) {
  const host = hostOf(destination);
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className={cn(overlay, "z-dialog")} />
        <AlertDialogPrimitive.Content className="fixed top-1/2 left-1/2 z-dialog flex max-h-[calc(100dvh-1.5rem)] w-110 max-w-[calc(100vw-1.5rem)] -translate-1/2 flex-col overflow-hidden rounded-action border border-border bg-background text-md leading-normal text-foreground outline-none">
          <section aria-label="Operation details" className="min-h-0 overflow-auto p-4 [overflow-wrap:anywhere]">
            <AlertDialogPrimitive.Title className="mb-3 text-xl font-bold">Open this link in Browser?</AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="whitespace-pre-wrap">
              {`${host}\n${destination}`}{claimed ? `\n\nWarning: the email shows “${claimed}”, but the link goes to ${host}.` : ""}
            </AlertDialogPrimitive.Description>
          </section>
          <footer className="flex shrink-0 flex-wrap gap-2 border-t border-border px-4 py-3">
            <AlertDialogPrimitive.Cancel className={choice}>Cancel</AlertDialogPrimitive.Cancel>
            <button type="button" onClick={onOpen} className={choice}>Open link</button>
          </footer>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
