import { File } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { StatusDot } from "../StatusDot.tsx";

export type InboxAttachmentRowProps = {
  /** The file's name. */
  name: string;
  /** Its size, already worded, such as "1.2 MB". */
  size: string;
  /** Reviews opening it, where saving it is offered too; offered only on a message read from Gmail. */
  onOpen?: () => void;
  /** Reviews saving it where it has no preview; left out where a save may already have happened, which Files shows. */
  onSave?: () => void;
  /** Tells the owner to open it in Gmail, where Alpha can neither show nor save it, as live v119's tile did. */
  onUnsupported?: () => void;
  /** A save of it may have happened and could not be confirmed: it is not offered again, and the owner is pointed to Files. */
  saveUnconfirmed?: boolean;
  /** The save used the browser's downloads instead of Files. */
  browserDownload?: boolean;
  /** The save goes through Android's picker, where the owner names the copy. */
  picker?: boolean;
};

/**
 * One attachment of a message: one button, its name and size on a rounded tile that reviews opening it, or saving it
 * where it has no preview. The review for opening saves it too, as live v119 did. One Alpha can neither show nor save
 * reads "Unsupported type or size" and still answers a tap, as v119's tile did.
 *
 * @model spec/app/inbox/message.md
 */
export function InboxAttachmentRow({ name, size, onOpen, onSave, onUnsupported, saveUnconfirmed = false, browserDownload = false, picker = false }: InboxAttachmentRowProps) {
  const saveLabel = picker ? "Save as…" : browserDownload ? "Download" : "Save to Files";
  const unsupported = !onOpen && !onSave && onUnsupported !== undefined;
  const detail = onOpen ? `${size} · Review attachment` : onSave && !saveUnconfirmed ? `${size} · No preview · ${saveLabel}` : unsupported ? `${size} · Unsupported type or size` : size;
  return (
    <div className="flex max-w-full items-center gap-2">
      <button
        type="button"
        disabled={!onOpen && !onSave && !unsupported}
        onClick={onOpen ?? onSave ?? onUnsupported}
        className={cn(focusRing, "flex max-w-full min-w-0 items-center gap-3 rounded-tile bg-secondary py-3 pr-4.5 pl-3.5 text-left text-secondary-foreground")}
      >
        {onOpen || onSave ? <span className="sr-only">{onOpen ? "Open " : "Save "}</span> : null}
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-background text-primary"><File className="size-5" /></span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{name}</span>{" "}
          <span className="text-fine text-muted-foreground">{detail}</span>
        </span>
      </button>
      {saveUnconfirmed ? <StatusDot status="warn" label={browserDownload ? "Save not confirmed, check your downloads" : picker ? "Save not confirmed, check the chosen file" : "Save not confirmed, look in Files"} /> : null}
    </div>
  );
}
