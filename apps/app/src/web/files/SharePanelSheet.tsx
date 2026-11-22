// spec/files/share.md, "The owner's choice sends once, from the panel on screen, after it closed"; spec/files/share.md, "A changed selection retires the panel with a notice, and nothing is sent from it"
import { Download, Mail, MessageSquare, Share2 } from "lucide-react";
import type { Destination, SharePanel } from "../../../gen/files__share.ts";
import { offers } from "../../../gen/files__share.ts";
import { ListRow, Sheet, SheetContent } from "../components/ui/index.ts";

export type SharePanelSheetProps = {
  panel: SharePanel;
  /** What is shared, such as the file's name or "Selected files". */
  title: string;
  /** Offers a saved copy, where the browser keeps downloads. */
  canSave?: boolean;
  onChoose: (id: number, destination: Destination) => void;
};

/**
 * The destinations for what the owner is sharing; only the panel on screen sends, once.
 * @model spec/files/share.md
 */
export function SharePanelSheet({ panel, title, canSave = false, onChoose }: SharePanelSheetProps) {
  const id = panel.active;
  return (
    <Sheet open={id !== 0} onOpenChange={(open) => !open && onChoose(id, "CancelShare")}>
      <SheetContent side="bottom" title={title}>
        {panel.notice && <p role="alert" className="px-5 text-sm text-destructive">The selection changed. Choose it again.</p>}
        <ul className="pb-4">
          <li><ListRow title="Share with another app" leading={<Share2 aria-hidden className="size-5" />} onClick={() => onChoose(id, "SystemSheet")} /></li>
          {offers(panel, id, "EmailDraft") && <li><ListRow title="Email" leading={<Mail aria-hidden className="size-5" />} onClick={() => onChoose(id, "EmailDraft")} /></li>}
          {offers(panel, id, "MessagesPicture") && <li><ListRow title="Messages" leading={<MessageSquare aria-hidden className="size-5" />} onClick={() => onChoose(id, "MessagesPicture")} /></li>}
          {canSave && <li><ListRow title="Save a copy" leading={<Download aria-hidden className="size-5" />} onClick={() => onChoose(id, "SaveCopy")} /></li>}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
