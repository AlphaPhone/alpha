import { Download, ExternalLink, FileText } from "lucide-react";
import { Button } from "../Button.tsx";
import { ListRow } from "../ListRow.tsx";
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
};

/**
 * One attachment of a message: its name and size, and opening or saving it, each reviewed first.
 *
 * @model spec/app/inbox/message.md
 */
export function InboxAttachmentRow({ name, size, onOpen, onSave, saveUnconfirmed = false }: InboxAttachmentRowProps) {
  return (
    <ListRow
      title={name}
      detail={saveUnconfirmed ? undefined : size}
      leading={<FileText />}
      trailing={
        <>
          {saveUnconfirmed ? <StatusDot status="warn" label="Save not confirmed, look in Files" /> : null}
          {onOpen ? <Button variant="ghost" size="icon" aria-label={`Open ${name}`} onClick={onOpen}><ExternalLink /></Button> : null}
          {onSave && !saveUnconfirmed ? <Button variant="ghost" size="icon" aria-label={`Save ${name}`} onClick={onSave}><Download /></Button> : null}
        </>
      }
    />
  );
}
