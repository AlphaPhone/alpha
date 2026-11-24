// spec/notes/webSource.md, "One action per dialog, only while the dialog is fresh over the note it reviewed"
import type { SourceDialog } from "../../../gen/notes__webSource.ts";
import { Button, Dialog, DialogContent, DialogTitle } from "../components/ui/index.ts";
import type { WebSource } from "../../notes/list.vibe";

export type WebSourceDialogProps = {
  /** The dialog machine's state. */
  dialog: SourceDialog;
  /** The page the note came from. */
  source?: WebSource;
  onClose: () => void;
  onVisit: () => void;
  onRemove: () => void;
};

/** The web page a summary note came from: open it, or remove the link from the note. One action per dialog. */
export function WebSourceDialog({ dialog, source, onClose, onVisit, onRemove }: WebSourceDialogProps) {
  return (
    <Dialog open={dialog.opened && source !== undefined} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent aria-label="Note web source">
        <DialogTitle className="[overflow-wrap:anywhere]">{source?.name}</DialogTitle>
        <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">{source?.url}</p>
        {dialog.unconfirmed && <p className="text-sm" role="status">Unconfirmed</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" disabled={dialog.busy} onClick={onRemove}>Remove web source</Button>
          <Button variant="secondary" onClick={onClose}>Done</Button>
          <Button disabled={dialog.busy} onClick={onVisit}>Open source page</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
