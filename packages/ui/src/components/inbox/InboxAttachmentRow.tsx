import { Download, File } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { StatusDot } from "../StatusDot.tsx";

export type InboxAttachmentRowProps = {
  /** The file's name. */
  name: string;
  /** Its size, already worded, such as "1.2 MB". */
  size: string;
  /** Reviews opening it; offered only on a message read from Gmail. */
  onOpen?: () => void;
  /** Reviews saving it; left out where a save may already have happened, which Files shows. */
  onSave?: () => void;
  /** A save of it may have happened and could not be confirmed: it is not offered again, and the owner is pointed to Files. */
  saveUnconfirmed?: boolean;
  /** The save used the browser's downloads instead of Files. */
  browserDownload?: boolean;
};

/**
 * One attachment of a message: its name and size on a rounded tile that opens it, and saving it, each reviewed first.
 *
 * @model spec/app/inbox/message.md
 */
export function InboxAttachmentRow({ name, size, onOpen, onSave, saveUnconfirmed = false, browserDownload = false }: InboxAttachmentRowProps) {
  return (
    <div className="flex max-w-full items-center gap-2">
      <button
        type="button"
        aria-label={`Open ${name}`}
        disabled={!onOpen}
        onClick={onOpen}
        className={cn(focusRing, "flex max-w-full min-w-0 items-center gap-3 rounded-tile bg-secondary py-3 pr-4.5 pl-3.5 text-left text-secondary-foreground")}
      >
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-background text-primary"><File className="size-5" /></span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm leading-tight font-semibold">{name}</span>
          <span className="mt-0.5 text-xs leading-tight text-muted-foreground">{size}</span>
        </span>
      </button>
      {saveUnconfirmed ? <StatusDot status="warn" label={browserDownload ? "Save not confirmed, check your downloads" : "Save not confirmed, look in Files"} /> : null}
      {onSave && !saveUnconfirmed ? (
        <button type="button" aria-label={`Save ${name}`} onClick={onSave} className={cn(focusRing, "flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-accent")}><Download aria-hidden className="size-5" /></button>
      ) : null}
    </div>
  );
}
