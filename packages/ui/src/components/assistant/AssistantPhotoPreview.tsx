import { X } from "lucide-react";
import { Button } from "../Button.tsx";
import { Dialog, DialogClose, DialogContent, DialogTitle, type DialogProps } from "../Dialog.tsx";

export type AssistantPhotoPreviewProps = Pick<DialogProps, "open" | "onOpenChange"> & {
  /** The photo's picture. */
  src: string;
  /** What the photo is called, which names the dialog. */
  name: string;
};

/**
 * A photo attached to a message opened over the conversation, before or after it is sent: the whole screen goes black
 * around the photo, with Close in the corner. Closing returns to where the owner was and opens no view.
 * @model spec/app/assistant/attachments.md
 */
export function AssistantPhotoPreview({ open, onOpenChange, src, name }: AssistantPhotoPreviewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        overlayClassName="bg-transparent dark:bg-transparent"
        // eslint-disable-next-line better-tailwindcss/no-unknown-classes -- The photo is shown on black in both themes, as on develop; `dark` is the design system's theme class.
        className="dark inset-0 top-0 flex max-w-none translate-y-0 touch-none items-center justify-center gap-0 overflow-hidden rounded-none bg-background px-4 pt-16 pb-4 text-foreground shadow-none motion-safe:animate-fade"
      >
        <DialogTitle className="sr-only">{name}</DialogTitle>
        <img src={src} alt={name} draggable={false} className="max-h-full max-w-full object-contain select-none" />
        <DialogClose asChild>
          <Button variant="ghost" size="icon" aria-label="Close" className="absolute top-4 right-4 z-10 rounded-full bg-foreground/15 hover:bg-foreground/25"><X aria-hidden /></Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
