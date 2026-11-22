// spec/files/browser.md, "A press starts a selection with its row, a tap adds or removes a row, and an empty selection ends"
import { Check, File, FileAudio, FileImage, FileText, FileVideo, Folder, type LucideIcon } from "lucide-react";
import { useRef } from "react";
import type { FileKind, Row } from "../../../gen/files__storage.ts";
import { ListRow } from "../components/ui/index.ts";
import { cn, focusRing } from "../lib/cn.ts";
import { countLabel, formatSize, shortDate } from "./format.ts";

const ICONS: Readonly<Record<FileKind, LucideIcon>> = {
  KindFolder: Folder, KindImage: FileImage, KindVideo: FileVideo, KindAudio: FileAudio, KindPdf: FileText, KindDocument: FileText, KindOther: File,
};

/** The icon of a kind of file. */
export function kindIcon(kind: FileKind): LucideIcon {
  return ICONS[kind];
}

export type FileRowProps = {
  row: Row;
  /** Whether the listing is selecting; undefined offers no selection. */
  selecting?: boolean;
  /** Whether this row is selected. */
  selected?: boolean;
  /** Shows the row's folder, for a category or filter spanning folders. */
  showFolder?: boolean;
  /** Draws the row as a grid tile. */
  grid?: boolean;
  /** A row that cannot be acted on now. */
  disabled?: boolean;
  /** A tap: open the file or folder, or, while selecting, select it. */
  onOpen: () => void;
  /** A long press or a secondary click: start or extend the selection. */
  onPress?: () => void;
};

/**
 * One file or folder of a listing: a tap opens it, a long press selects it.
 * @model spec/files/browser.md
 */
export function FileRow({ row, selecting, selected = false, showFolder = false, grid = false, disabled, onOpen, onPress }: FileRowProps) {
  const pressed = useRef<number | undefined>(undefined);
  const held = useRef(false);
  const Icon = kindIcon(row.kind);
  const detail = row.kind === "KindFolder"
    ? row.children >= 0 ? countLabel(row.children) : ""
    : [formatSize(row.size), shortDate(row.modified), showFolder ? row.folder || "Internal storage" : ""].filter(Boolean).join(" · ");
  const label = selecting ? `${selected ? "Deselect" : "Select"} ${row.name}` : `Open ${row.name}`;
  const press = {
    onPointerDown: () => {
      held.current = false;
      pressed.current = window.setTimeout(() => {
        held.current = true;
        onPress?.();
      }, 500);
    },
    onPointerUp: () => window.clearTimeout(pressed.current),
    onPointerCancel: () => window.clearTimeout(pressed.current),
    onPointerLeave: () => window.clearTimeout(pressed.current),
    onContextMenu: (event: { preventDefault(): void }) => {
      event.preventDefault();
      window.clearTimeout(pressed.current);
      if (!held.current) onPress?.();
      held.current = true;
    },
    onClick: () => {
      if (held.current) {
        held.current = false;
        return;
      }
      onOpen();
    },
  };
  const mark = selecting ? (
    <span aria-hidden className={cn("flex size-5 items-center justify-center rounded-full border border-input", selected && "border-primary bg-primary text-primary-foreground")}>
      {selected && <Check className="size-3" />}
    </span>
  ) : undefined;
  if (grid) {
    return (
      <button type="button" aria-label={label} aria-pressed={selecting ? selected : undefined} disabled={disabled}
        className={cn(focusRing, "flex flex-col items-center gap-2 rounded-lg p-3 text-center active:bg-accent disabled:opacity-50", selected && "bg-secondary")} {...press}>
        <span className="relative">
          <Icon aria-hidden className={cn("size-10", row.kind === "KindFolder" ? "text-primary" : "text-muted-foreground")} />
          {mark && <span className="absolute -top-1 -right-1">{mark}</span>}
        </span>
        <span className="line-clamp-2 w-full text-sm break-words">{row.name}</span>
      </button>
    );
  }
  return (
    <ListRow aria-label={label} aria-pressed={selecting ? selected : undefined} selected={selected} disabled={disabled}
      title={row.name} detail={detail || undefined}
      leading={<Icon aria-hidden className={cn("size-6", row.kind === "KindFolder" ? "text-primary" : "text-muted-foreground")} />}
      trailing={mark} {...press} />
  );
}
