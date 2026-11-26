import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@repo/ui";

interface DeleteMessageDialogProps {
  open: boolean;
  container: HTMLElement | null;
  onCancel: () => void;
  onDelete: () => void;
  onCloseAutoFocus: (event: Event) => void;
}

const action = "min-h-11 px-3.5 text-base leading-[normal] hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:bg-accent";

/** The local confirmation of a deletion in the conversation. */
export function DeleteMessageDialog({ open, container, onCancel, onDelete, onCloseAutoFocus }: DeleteMessageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent container={container ?? undefined} role="alertdialog" onCloseAutoFocus={onCloseAutoFocus}
        overlayClassName="absolute z-10 bg-black/[13.333333%] motion-safe:animate-none dark:bg-black/[13.333333%]"
        className="absolute inset-x-0 top-1/2 bottom-auto z-20 w-70 max-w-9/10 -translate-y-1/2 gap-0 rounded-tile bg-background p-5 text-base leading-[normal] shadow-none motion-safe:animate-none">
        <DialogTitle className="sr-only">Delete message?</DialogTitle>
        <DialogDescription className="mt-0 mb-4 text-lg leading-[normal] text-foreground">Delete this message from this phone?</DialogDescription>
        <div className="flex justify-end gap-2">
          <button type="button" className={action} onClick={onCancel}>Cancel</button>
          <button type="button" className={`${action} text-hangup`} onClick={onDelete}>Delete</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
