import { SheetContent, Sheet, type SheetProps } from "../Sheet.tsx";
import { AssistantAttachmentPickerBody, type AssistantAttachmentPickerBodyProps } from "./AssistantAttachmentPickerBody.tsx";

export type AssistantAttachmentPickerProps = Pick<SheetProps, "open" | "onOpenChange"> & {
  /** What the sheet shows; Cancel closes it by `onOpenChange`. */
  picker: AssistantAttachmentPickerBodyProps;
};

/**
 * The sheet that rises to choose photos or documents to attach; closing it cancels, and files still being read are not attached.
 * @model spec/app/assistant/attachments.md
 */
export function AssistantAttachmentPicker({ open, onOpenChange, picker }: AssistantAttachmentPickerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title="Attach">
        <AssistantAttachmentPickerBody {...picker} />
      </SheetContent>
    </Sheet>
  );
}
