// spec/files/filter.md, "Story: Let the agent show me the files I asked about"; spec/files/filter.md, "A filter says it found nothing only after a complete query"; spec/files/filter.md, "Cancelling, clearing and leaving retire the filter and its rows"
import { SearchX, X } from "lucide-react";
import type { Filtering } from "../../../gen/files__filter.ts";
import { showsNoMatches } from "../../../gen/files__filter.ts";
import type { Row } from "../../../gen/files__storage.ts";
import { Alert, Button, EmptyState, Skeleton } from "../components/ui/index.ts";
import { FileRow } from "./FileRow.tsx";
import { countLabel } from "./format.ts";

const KIND_LABELS: Readonly<Record<string, string>> = {
  AnyKind: "", ImageKind: "Images", VideoKind: "Videos", AudioKind: "Audio", DocumentKind: "Documents", PdfKind: "PDFs", FolderKind: "Folders",
};

/** The chip a filter shows, such as `“lease” · PDFs · in Download · 3`. */
export function chipLabel(f: Filtering): string {
  const c = f.criteria;
  const parts = [c.text ? `“${c.text}”` : "", KIND_LABELS[c.kind] ?? "", c.within ? `in ${c.within.slice(c.within.lastIndexOf("/") + 1)}` : "",
    c.since || c.until ? [c.since.slice(0, 10), c.until.slice(0, 10)].filter(Boolean).join(" – ") : ""];
  return `${parts.filter(Boolean).join(" · ")} · ${f.rows.length}${f.complete ? "" : "+"}`;
}

/** The agent's filter on screen and what the owner does with its results. */
export type FilterResultsProps = {
  filter: Filtering;
  /** A change is in flight. */
  busy?: boolean;
  onOpen: (row: Row) => void;
  onClear: () => void;
};

/**
 * The agent's filter on screen: its chip, its results numbered from one, and whether the search finished.
 * @model spec/files/filter.md
 */
export function FilterResults({ filter, busy = false, onOpen, onClear }: FilterResultsProps) {
  const reading = filter.pending !== 0 && filter.rows.length === 0;
  return (
    <section aria-label="Filter results" className="flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="min-w-0 flex-1 truncate rounded-full bg-secondary px-3 py-1 text-sm">{chipLabel(filter)}</span>
        <Button variant="ghost" size="icon" aria-label="Clear filter" onClick={onClear}><X className="size-4" /></Button>
      </div>
      {filter.unavailable && <Alert role="alert" className="mx-4">Files could not read this filter.</Alert>}
      {!filter.unavailable && !filter.complete && filter.pending === 0 && (
        <p role="status" className="px-4 text-sm text-muted-foreground">Search incomplete. Showing {countLabel(filter.rows.length)} from the scanned folders.</p>
      )}
      {reading && <div className="flex flex-col gap-2 p-4" aria-busy><Skeleton className="h-14" /><Skeleton className="h-14" /></div>}
      {showsNoMatches(filter) && <EmptyState title="No files match." icon={<SearchX className="size-10" />} />}
      <ol aria-label="Results">
        {filter.rows.map((row) => (
          <li key={row.key}><FileRow row={row} showFolder disabled={busy} onOpen={() => onOpen(row)} /></li>
        ))}
      </ol>
    </section>
  );
}
