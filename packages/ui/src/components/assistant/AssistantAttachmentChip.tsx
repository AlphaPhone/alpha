import { File, FileText, Image as ImageIcon, Mail, X } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

export type AssistantAttachment = {
  /** Keeps the attachment in place while others come and go. */
  id: string;
  /** A photo or a file picked by the owner, the mail open in Inbox, or a transcript handed over by "Ask Alpha about this". */
  kind: "image" | "file" | "mail" | "transcript";
  /** What the owner calls it: the file name, the mail's subject, the transcript's title. */
  name: string;
  /** The picture of an image. */
  src?: string;
};

export type AssistantAttachmentChipProps = {
  /** What is attached. */
  attachment: AssistantAttachment;
  /** Takes it off the message about to be sent; the remove control is shown only with it. */
  onRemove?: () => void;
  /** Opens an image over the conversation; an image is pressed only with it. */
  onPreview?: () => void;
};

const icons = { image: ImageIcon, file: File, mail: Mail, transcript: FileText };
const press = cn(focusRing, "relative flex min-h-10.5 min-w-0 items-center gap-1.5 rounded-action px-2.5 py-1 text-left");

/** One attachment as a pill: a thumbnail or an icon and its name, with a control to remove it before it is sent, or to look at an image. */
export function AssistantAttachmentChip({ attachment, onRemove, onPreview }: AssistantAttachmentChipProps) {
  const Icon = icons[attachment.kind];
  const face = attachment.kind === "image" && attachment.src
    ? <img src={attachment.src} alt="" className="size-6.5 shrink-0 rounded-box object-cover" />
    : <Icon aria-hidden className="size-4 shrink-0" />;
  const label = <span className="truncate text-base">{attachment.name}</span>;
  return (
    <span className="inline-flex max-w-full items-center overflow-hidden rounded-action border border-border bg-secondary text-secondary-foreground">
      {onPreview && attachment.kind === "image" ? (
        <button type="button" aria-label={`Preview ${attachment.name}`} onClick={onPreview} className={cn(press, "transition-colors duration-fast ease-standard hover:bg-accent")}>{face}{label}</button>
      ) : (
        <span className={cn("flex min-h-10.5 min-w-0 items-center gap-1.5 py-1 pl-2.5", onRemove ? "pr-1" : "pr-2.5")}>{face}{label}</span>
      )}
      {onRemove ? (
        <button type="button" aria-label={`Remove ${attachment.name}`} onClick={onRemove} className={cn(focusRing, "relative flex h-10.5 min-w-11 shrink-0 items-center justify-center transition-colors duration-fast ease-standard hover:bg-accent")}>
          <X aria-hidden className="size-4" />
        </button>
      ) : null}
    </span>
  );
}
