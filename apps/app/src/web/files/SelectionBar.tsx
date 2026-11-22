// spec/files/browser.md, "A press starts a selection with its row, a tap adds or removes a row, and an empty selection ends"; spec/files/share.md, "A selection reaches Android's share sheet only when it is one to 100 files that are all still there"
import { CheckCheck, Copy, Download, FolderInput, Info, Pencil, Share2, Trash2, X } from "lucide-react";
import { Button } from "../components/ui/index.ts";

export type SelectionBarProps = {
  /** How many rows are selected. */
  count: number;
  /** A change is in flight: every control waits. */
  busy?: boolean;
  onCancel: () => void;
  onSelectAll: () => void;
  onShare: () => void;
  onMove: () => void;
  onCopy: () => void;
  onRename: () => void;
  onDetails: () => void;
  onTrash: () => void;
  /** Download the selection; only where the browser keeps downloads. */
  onDownload?: () => void;
};

/** The actions on what is selected in a listing. */
export function SelectionBar({ count, busy = false, onCancel, onSelectAll, onShare, onMove, onCopy, onRename, onDetails, onTrash, onDownload }: SelectionBarProps) {
  const none = busy || count === 0;
  return (
    <div role="toolbar" aria-label="Selection" className="sticky bottom-0 flex items-center gap-1 border-t border-border bg-background px-2 py-1">
      <Button variant="ghost" size="icon" aria-label="Cancel selection" onClick={onCancel} disabled={busy}><X className="size-5" /></Button>
      <span className="flex-1 text-sm tabular-nums" aria-live="polite">{count} selected</span>
      <Button variant="ghost" size="icon" aria-label="Select all" onClick={onSelectAll} disabled={busy}><CheckCheck className="size-5" /></Button>
      <Button variant="ghost" size="icon" aria-label="Share" onClick={onShare} disabled={none}><Share2 className="size-5" /></Button>
      <Button variant="ghost" size="icon" aria-label="Move" onClick={onMove} disabled={none}><FolderInput className="size-5" /></Button>
      <Button variant="ghost" size="icon" aria-label="Copy" onClick={onCopy} disabled={none}><Copy className="size-5" /></Button>
      {count === 1 && <Button variant="ghost" size="icon" aria-label="Rename" onClick={onRename} disabled={busy}><Pencil className="size-5" /></Button>}
      {count === 1 && <Button variant="ghost" size="icon" aria-label="Details" onClick={onDetails} disabled={busy}><Info className="size-5" /></Button>}
      {onDownload && <Button variant="ghost" size="icon" aria-label="Download" onClick={onDownload} disabled={none}><Download className="size-5" /></Button>}
      <Button variant="ghost" size="icon" aria-label="Move to Trash" onClick={onTrash} disabled={none}><Trash2 className="size-5" /></Button>
    </div>
  );
}
