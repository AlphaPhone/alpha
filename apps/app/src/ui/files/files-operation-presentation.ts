/** The Files review card: an agent Files proposal's title and exact effect. The operation
 * contract, its validation and where it may run stay in the shared Files browser contract. */
import type {
  FilesAgentOperation,
  FilesFilterKind,
  FilesFilterOperation,
} from "@elizaos/plugin-assistant/device-actions/files-browser-contract";

const baseName = (path: string) => path.slice(path.lastIndexOf("/") + 1);
const place = (path: string) =>
  path ? path.split("/").join(" › ") : "Internal storage";
const listed = (list: readonly string[]) =>
  list.length <= 3
    ? list.map(baseName).join(", ")
    : `${list.slice(0, 2).map(baseName).join(", ")} and ${list.length - 2} more`;
const count = (n: number) => (n === 1 ? "1 item" : `${n} items`);
const KIND_LABELS: Record<FilesFilterKind, string> = {
  image: "Images",
  video: "Videos",
  audio: "Audio",
  document: "Documents",
  pdf: "PDFs",
  folder: "Folders",
};
/** The chip a filter shows, for example `“lease” · PDFs · in Download`. */
function filesFilterLabel(op: Omit<FilesFilterOperation, "type">): string {
  return [
    op.text ? `“${op.text}”` : "",
    op.kind ? KIND_LABELS[op.kind] : "",
    op.folder !== undefined
      ? `in ${baseName(op.folder) || "Internal storage"}`
      : "",
    op.from || op.to
      ? [op.from?.slice(0, 10), op.to?.slice(0, 10)].filter(Boolean).join(" – ")
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
/** Owner-facing title and the exact effect of a proposal. */
export function describeFilesOperation(op: FilesAgentOperation): {
  title: string;
  description: string;
} {
  if (op.type !== "files_open" && "shown" in op)
    return { title: "File names required", description: "Choose files by name for this request." };
  switch (op.type) {
    case "files_filter":
      return { title: "Show files", description: filesFilterLabel(op) };
    case "files_open":
      return {
        title: "Open file",
        description: "shown" in op ? `Shown item ${op.shown}` : place(op.path),
      };
    case "files_share":
      return {
        title: `Share ${count(op.paths.length)}`,
        description: listed(op.paths),
      };
    case "files_trash":
      return {
        title: `Move ${count(op.paths.length)} to Trash`,
        description: listed(op.paths),
      };
    case "files_move":
      return {
        title: `Move ${count(op.paths.length)}`,
        description: `${listed(op.paths)} → ${place(op.dest)}`,
      };
    case "files_folder_create":
      return {
        title: "New folder",
        description: place(op.parent ? `${op.parent}/${op.name}` : op.name),
      };
  }
}
