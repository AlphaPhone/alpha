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
/** Shown positions before the phone resolves them to files (files.shown-target.v1). */
const shownLabel = (list: readonly number[]) =>
  `${list.length === 1 ? "Item" : "Items"} ${list.join(", ")} in the results shown`;
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
type FilesTarget = { paths: string[] } | { shown: number[] };
const targets = (op: FilesTarget) =>
  "shown" in op ? op.shown.length : op.paths.length;
const targetLabel = (op: FilesTarget) =>
  "shown" in op ? shownLabel(op.shown) : listed(op.paths);
/** Owner-facing title and the exact effect of a proposal. */
export function describeFilesOperation(op: FilesAgentOperation): {
  title: string;
  description: string;
} {
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
        title: `Share ${count(targets(op))}`,
        description: targetLabel(op),
      };
    case "files_trash":
      return {
        title: `Move ${count(targets(op))} to Trash`,
        description: targetLabel(op),
      };
    case "files_move":
      return {
        title: `Move ${count(targets(op))}`,
        description: `${targetLabel(op)} → ${place(op.dest)}`,
      };
    case "files_folder_create":
      return {
        title: "New folder",
        description: place(op.parent ? `${op.parent}/${op.name}` : op.name),
      };
  }
}
