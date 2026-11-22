// spec/browser/egress.md, "Share waits for the menu to close, then hands Android only the same document, one share at a time"; spec/browser/egress.md, "Share by email opens a draft with the page's address and name, and Copy link copies its address, each only from a shown settled page"
import { Copy, Mail, Share2 } from "lucide-react";
import type { Session } from "../../../gen/browser__session.ts";
import { ListRow, Sheet, SheetContent } from "../components/ui/index.ts";

export interface ShareSheetProps {
  session: Session;
  onShare: () => void;
  onEmail: () => void;
  onCopy: () => void;
  onDismiss: () => void;
}

/**
 * How the selected page leaves Browser by the owner's own tap.
 * @model spec/browser/egress.md
 */
export function ShareSheet({ session, onShare, onEmail, onCopy, onDismiss }: ShareSheetProps) {
  return (
    <Sheet open={session.layers.share} onOpenChange={(open) => { if (!open) onDismiss(); }}>
      <SheetContent side="bottom" title="Share page">
        <div className="pb-4">
          {session.host === "NativeHost" && <ListRow title="Share…" leading={<Share2 aria-hidden />} onClick={onShare} />}
          <ListRow title="Share by email" leading={<Mail aria-hidden />} onClick={onEmail} />
          <ListRow title="Copy link" leading={<Copy aria-hidden />} onClick={onCopy} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
