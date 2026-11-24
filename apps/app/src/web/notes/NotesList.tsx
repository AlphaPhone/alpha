// spec/notes/list.md, "The list holds every row once, pinned rows first, then by time, ties in stored order"; spec/notes/list.md, "A row is shown when it matches every part of the filter"
import { CheckSquare, Link2, Mic, Pin, StickyNote } from "lucide-react";
import { EmptyState, ListRow } from "../components/ui/index.ts";
import { dateLabel, type NoteRow, preview } from "../../notes/list.vibe";

export type NotesListProps = {
  /** The rows in the order the list shows them. */
  rows: readonly NoteRow[];
  /** The note open in the editor, shown as selected. */
  openId?: string;
  /** Now, for the short dates. */
  now: number;
  /** Open one note. */
  onOpen: (id: string) => void;
  /** When set, list rows select notes for deletion. */
  selection?: { ids: ReadonlySet<string>; busy: boolean };
};

const icons = { text: StickyNote, list: CheckSquare, voice: Mic, link: Link2 } as const;
const kindNames = { text: "Note", list: "Checklist", voice: "Voice note", link: "Link" } as const;

/** The Notes list: one row per note with its kind, title, date and two-line preview. */
export function NotesList({ rows, openId, now, onOpen, selection }: NotesListProps) {
  if (rows.length === 0) return <EmptyState title="No notes" icon={<StickyNote aria-hidden />} />;
  return (
    <ul className="flex flex-col divide-y divide-border">
      {rows.map((row) => {
        const Icon = icons[row.kind];
        const title = row.title.trim() === "" ? kindNames[row.kind] : row.title;
        return (
          <li key={row.id}>
            <ListRow
              title={title}
              detail={<span className="line-clamp-2 whitespace-pre-line">{preview(row)}</span>}
              leading={<Icon aria-label={kindNames[row.kind]} className="size-5 text-muted-foreground" />}
              trailing={<span className="flex items-center gap-1 font-mono text-xs uppercase">{row.pinned && <Pin aria-label="Pinned" className="size-3" />}{dateLabel(row.at, now)}</span>}
              selected={selection ? selection.ids.has(row.id) : row.id === openId}
              aria-pressed={selection && selection.ids.has(row.id)}
              aria-label={selection ? `Select ${title}` : undefined}
              disabled={selection?.busy}
              onClick={() => onOpen(row.id)}
            />
          </li>
        );
      })}
    </ul>
  );
}
