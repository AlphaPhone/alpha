// spec/files/preview.md, "A shown document is the device's selection of one file and what Files knew of it"
import { parentOf } from "@elizaos/plugin-files/client";
import type { FileKind } from "../../../gen/files__storage.ts";
import { Button, Dialog, DialogContent, DialogTitle } from "../components/ui/index.ts";
import { countLabel, formatSize, fullDate, locationLabel, typeLabel } from "./format.ts";

export type DetailsDialogProps = {
  name: string;
  path: string;
  volumeName: string;
  kind: FileKind;
  mimeType: string;
  /** Bytes, or -1 when unknown. */
  size: number;
  /** Milliseconds, or 0 when unknown. */
  modified: number;
  /** A folder's child count, or -1 when unknown. */
  children?: number;
  onClose: () => void;
};

/** What one file or folder is, how big, when it changed and where it is; nothing unknown is shown. */
export function DetailsDialog({ name, path, volumeName, kind, mimeType, size, modified, children = -1, onClose }: DetailsDialogProps) {
  const rows = [
    { label: "Type", value: typeLabel(mimeType, kind) },
    kind === "KindFolder"
      ? { label: "Contains", value: children >= 0 ? countLabel(children) : "" }
      : { label: "Size", value: size >= 0 ? `${formatSize(size)}${size >= 1024 ? ` (${size.toLocaleString()} bytes)` : ""}` : "" },
    { label: "Modified", value: fullDate(modified) },
    { label: "Location", value: path ? locationLabel(volumeName, parentOf(path)) : "" },
  ].filter((row) => row.value);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle className="break-words">{name}</DialogTitle>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="contents">
              <dt className="font-mono text-xs tracking-widest text-muted-foreground uppercase">{row.label}</dt>
              <dd className="break-words">{row.value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex justify-end"><Button variant="ghost" onClick={onClose}>Done</Button></div>
      </DialogContent>
    </Dialog>
  );
}
