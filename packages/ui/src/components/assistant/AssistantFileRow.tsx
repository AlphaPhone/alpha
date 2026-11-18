import { useId } from "react";
import { File, Image as ImageIcon } from "lucide-react";
import { Checkbox } from "../Checkbox.tsx";
import { ListRow } from "../ListRow.tsx";

export type AssistantFile = {
  /** Keeps the file in place between pages. */
  id: string;
  /** The file's name. */
  name: string;
  /** Its size or date, a few words. */
  detail?: string;
  /** A photo or a document. */
  kind: "photo" | "document";
  /** The photo's thumbnail. */
  thumbnail?: string;
};

export type AssistantFileRowProps = {
  /** The file to choose. */
  file: AssistantFile;
  /** It is among the files chosen to attach. */
  selected: boolean;
  /** Chooses or unchooses it; absent when it cannot be chosen because the room is full, or while the chosen files are being read. */
  onSelect?: (selected: boolean) => void;
};

/** One photo or document the owner can choose to attach: a thumbnail or an icon, its name, and a check. */
export function AssistantFileRow({ file, selected, onSelect }: AssistantFileRowProps) {
  const id = useId();
  const Icon = file.kind === "photo" ? ImageIcon : File;
  return (
    <ListRow
      asChild
      title={file.name}
      detail={file.detail}
      leading={file.thumbnail ? <img src={file.thumbnail} alt="" className="size-10 rounded-md object-cover" /> : <Icon />}
      trailing={<Checkbox id={id} aria-label={file.name} checked={selected} disabled={!onSelect} onCheckedChange={(checked) => onSelect?.(checked === true)} />}
    >
      <label htmlFor={id} />
    </ListRow>
  );
}
