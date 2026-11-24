import { AssistantAttachmentChip, type AssistantAttachment } from "./AssistantAttachmentChip.tsx";

export type AssistantPendingAttachmentsProps = {
  /** What waits to go with the next message, in the order added. */
  attachments: AssistantAttachment[];
  /** How many files the upload allows: a count of it shows once it is reached. */
  limit: number;
  /** Takes one off; removing is not offered while a send is in hand. */
  onRemove?: (id: string) => void;
  /** Opens an image over the conversation. */
  onPreview?: (id: string) => void;
};

/** The files, mail, transcript and photo waiting to go with the message being written, each removable. */
export function AssistantPendingAttachments({ attachments, limit, onRemove, onPreview }: AssistantPendingAttachmentsProps) {
  const files = attachments.filter((attachment) => attachment.kind === "file" || attachment.kind === "image").length;
  return (
    <div role="group" aria-label="Attached" className="flex flex-wrap items-center gap-2">
      {attachments.map((attachment) => (
        <AssistantAttachmentChip
          key={attachment.id}
          attachment={attachment}
          onRemove={onRemove && (() => onRemove(attachment.id))}
          onPreview={onPreview && (() => onPreview(attachment.id))}
        />
      ))}
      {files >= limit ? <span className="text-sm text-muted-foreground">{`${files} of ${limit}`}</span> : null}
    </div>
  );
}
