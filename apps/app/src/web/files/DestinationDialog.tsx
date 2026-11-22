// spec/files/mutations.md, "A row is done only when its answer is the operation's result and names the result"; spec/files/storage.md, "A row names one file or folder of one volume by a key unique in its listing"
import { breadcrumbs, parentOf, within } from "@elizaos/plugin-files/client";
import { ArrowUp, Folder, FolderPlus } from "lucide-react";
import type { Row } from "../../../gen/files__storage.ts";
import { Button, Dialog, DialogContent, DialogTitle, ListRow, Skeleton } from "../components/ui/index.ts";

export type DestinationDialogProps = {
  /** Move or copy. */
  op: "move" | "copy";
  /** The paths being moved or copied. */
  paths: readonly string[];
  /** The folder the picker shows. */
  at: string;
  /** Its folders, or undefined while they are read or when the folder could not be read. */
  folders: readonly Row[] | undefined;
  volumeName: string;
  busy?: boolean;
  onOpenFolder: (path: string) => void;
  onNewFolder: () => void;
  onConfirm: () => void;
  onCancel: () => void;
};

/** The Move to or Copy to picker: walk the folders and confirm the one shown; a folder never moves into itself. */
export function DestinationDialog({ op, paths, at, folders, volumeName, busy = false, onOpenFolder, onNewFolder, onConfirm, onCancel }: DestinationDialogProps) {
  const offered = (folders ?? []).filter((f) => !paths.some((p) => within(f.path, p)));
  const unchanged = op === "move" && paths.every((p) => parentOf(p) === at);
  const crumbs = breadcrumbs(at, volumeName).map((c) => c.label).join(" › ");
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onCancel()}>
      <DialogContent>
        <DialogTitle>{op === "move" ? "Move to" : "Copy to"}</DialogTitle>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Up" disabled={at === "" || busy} onClick={() => onOpenFolder(parentOf(at))}><ArrowUp className="size-4" /></Button>
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{crumbs}</span>
          <Button variant="ghost" size="icon" aria-label="New folder" disabled={busy} onClick={onNewFolder}><FolderPlus className="size-4" /></Button>
        </div>
        <ul aria-label="Folders" className="max-h-80 overflow-y-auto">
          {folders === undefined && <li aria-busy><Skeleton className="h-12" /></li>}
          {offered.map((f) => (
            <li key={f.key}><ListRow title={f.name} aria-label={`Open ${f.name}`} leading={<Folder aria-hidden className="size-5 text-primary" />} disabled={busy} onClick={() => onOpenFolder(f.path)} /></li>
          ))}
        </ul>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button onClick={onConfirm} loading={busy} disabled={unchanged || folders === undefined}>{op === "move" ? "Move here" : "Copy here"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
