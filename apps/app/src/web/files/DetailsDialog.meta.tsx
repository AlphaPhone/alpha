import type { ComponentMeta } from "vibestack/stories";
import type { DetailsDialogProps } from "./DetailsDialog.tsx";
import { rows } from "./fixtures.ts";

export const meta: ComponentMeta<DetailsDialogProps> = {
  args: { name: rows[1]!.name, path: rows[1]!.path, volumeName: "Internal storage", kind: rows[1]!.kind, mimeType: rows[1]!.mimeType, size: rows[1]!.size,
    modified: rows[1]!.modified, onClose: () => undefined },
  examples: { Folder: { name: rows[0]!.name, path: rows[0]!.path, kind: "KindFolder", mimeType: "", size: 0, children: 4 }, Unknown: { size: -1, modified: 0, path: "" } },
};
