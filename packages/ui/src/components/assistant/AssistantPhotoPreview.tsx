import { Dialog, DialogContent, DialogTitle, type DialogProps } from "../Dialog.tsx";

export type AssistantPhotoPreviewProps = Pick<DialogProps, "open" | "onOpenChange"> & {
  /** The photo's picture. */
  src: string;
  /** What the photo is called, which names the dialog. */
  name: string;
};

/**
 * A photo attached to a message opened over the conversation, before or after it is sent; closing returns to where the owner was and opens no view.
 * @model spec/app/assistant/attachments.md
 */
export function AssistantPhotoPreview({ open, onOpenChange, src, name }: AssistantPhotoPreviewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel="Close" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{name}</DialogTitle>
        <img src={src} alt={name} className="max-h-[70dvh] w-full rounded-lg object-contain" />
      </DialogContent>
    </Dialog>
  );
}
