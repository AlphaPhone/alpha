/** The Notes organisation review card: the change itself, nothing else. The operation contract,
 * its validation and where it may run stay in the shared Notes organisation contract. */
import type {
  NotesKind,
  NotesOrganizeOperation,
} from "@elizaos/plugin-assistant/device-actions/notes-organize-contract";

const quoted = (value: string) => `“${value}”`;
const KIND_LABELS: Record<NotesKind, string> = {
  text: "Notes",
  list: "Checklists",
  voice: "Voice notes",
  link: "Links",
};
export function describeNotesOrganizeOperation(op: NotesOrganizeOperation): {
  title: string;
  description: string;
} {
  if (op.type === "notes_filter" || op.type === "notes_list_filter")
    return {
      title: "Show notes",
      description: [
        op.text ? quoted(op.text) : "",
        op.kind ? KIND_LABELS[op.kind] : "",
        "folder" in op && op.folder ? `In ${op.folder}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
    };
  if (op.type === "notes_move")
    return {
      title: "Move note",
      description: op.folder === null ? "To no folder" : `To ${op.folder}`,
    };
  if (op.type === "notes_folder_create")
    return { title: "New folder", description: op.name };
  if (op.type === "notes_record")
    return op.action === "start"
      ? { title: "Record voice note", description: "In Notes" }
      : {
          title: "Stop recording",
          description: "Save as a voice note",
        };
  return { title: "Restore note", description: "From Recently deleted" };
}
