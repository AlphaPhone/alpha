import type { ComponentMeta } from "vibestack/stories";
import type { DestinationDialogProps } from "./DestinationDialog.tsx";
import { rows } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<DestinationDialogProps> = {
  args: { op: "move", paths: [rows[1]!.path], at: "", folders: [{ ...rows[0]!, key: "primary\nDownload", path: "Download", folder: "", name: "Download" }, { ...rows[0]!, key: "primary\nDocuments", path: "Documents", folder: "", name: "Documents" }], volumeName: "Internal storage",
    onOpenFolder: none, onNewFolder: none, onConfirm: none, onCancel: none },
  examples: { Copy: { op: "copy" }, Reading: { folders: undefined }, SameFolder: { at: "Download", folders: [rows[0]!] }, Busy: { busy: true } },
};
