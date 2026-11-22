// spec/files/browser.md, "Story: Walk my folders and categories"; spec/files/browser.md, "Story: Select files and act on them together"; spec/files/browser.md, "Story: Sort and view a listing my way"; spec/files/storage.md, "Only a complete read with no rows is empty; a partial read keeps its rows"
import { breadcrumbs } from "@elizaos/plugin-files/client";
import { ArrowUpDown, CheckSquare, Folder, LayoutGrid, List } from "lucide-react";
import type { Browser, FolderGroup, SortMode } from "../../../gen/files__browser.ts";
import { selectable, showsEmpty } from "../../../gen/files__browser.ts";
import type { Row } from "../../../gen/files__storage.ts";
import { Alert, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, EmptyState, ListRow, Skeleton } from "../components/ui/index.ts";
import { sortRows } from "../../files/paths.vibe";
import { FileRow, kindIcon } from "./FileRow.tsx";
import { CATEGORY_LABELS, countLabel } from "./format.ts";

const SORTS: readonly { mode: SortMode; label: string; order: [string, string] }[] = [
  { mode: "ByName", label: "Name", order: ["A–Z", "Z–A"] },
  { mode: "ByDate", label: "Date", order: ["Newest first", "Oldest first"] },
  { mode: "BySize", label: "Size", order: ["Largest first", "Smallest first"] },
];

export type ListingViewProps = {
  browser: Browser;
  /** The name of the volume the folder is on. */
  volumeName: string;
  /** Whether a row may be pressed or tapped into the selection now. */
  canSelect: boolean;
  onOpen: (row: Row) => void;
  onToggle: (key: string) => void;
  onGroup: (group: FolderGroup) => void;
  onCrumb: (path: string) => void;
  onSort: (mode: SortMode) => void;
  onGrid: () => void;
  onBeginSelecting: () => void;
};

/**
 * A folder or category: its rows or folder groups, partial-read notice, sorting, list or grid, and selection.
 * @model spec/files/browser.md
 */
export function ListingView({ browser, volumeName, canSelect, onOpen, onToggle, onGroup, onCrumb, onSort, onGrid, onBeginSelecting }: ListingViewProps) {
  const place = browser.place;
  const folder = place.tag === "InFolder" ? place : undefined;
  const crumbs = folder ? breadcrumbs(folder.path, volumeName) : [];
  const rows = sortRows(browser.rows, browser.sort, browser.reverse);
  const grouped = browser.groups.length > 0 && !selectable(place);
  const emptyTitle = place.tag === "InCategory" ? `No ${CATEGORY_LABELS[place.category].toLowerCase()}` : "This folder is empty";
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1 px-2">
        {crumbs.length > 0 && (
          <nav aria-label="Location" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm">
            {crumbs.map((crumb, index) => index === crumbs.length - 1
              ? <span key={crumb.path} aria-current="page" className="shrink-0 px-1 font-medium">{crumb.label}</span>
              : <Button key={crumb.path} variant="ghost" size="sm" className="shrink-0" onClick={() => onCrumb(crumb.path)}>{crumb.label} ›</Button>)}
          </nav>
        )}
        <span className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Sort and more" disabled={browser.mutations > 0}><ArrowUpDown className="size-5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SORTS.map((s) => (
              <DropdownMenuItem key={s.mode} onSelect={() => onSort(s.mode)} aria-checked={browser.sort === s.mode} role="menuitemradio">
                {s.label}{browser.sort === s.mode ? ` · ${s.order[browser.reverse ? 1 : 0]}` : ""}
              </DropdownMenuItem>
            ))}
            {canSelect && rows.length > 0 && <DropdownMenuItem onSelect={onBeginSelecting}><CheckSquare className="size-4" />Select</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" aria-label={browser.grid ? "List view" : "Grid view"} onClick={onGrid} disabled={browser.mutations > 0}>
          {browser.grid ? <List className="size-5" /> : <LayoutGrid className="size-5" />}
        </Button>
      </div>
      {browser.listing === "Failed" && <Alert role="alert" className="m-4">Files could not be read.</Alert>}
      {browser.listing === "Partial" && (
        <p role="status" className="px-4 py-2 text-sm text-muted-foreground">
          {browser.listedCount > 0 ? `Showing the newest ${countLabel(rows.length)} of ${browser.listedCount}.` : `Showing ${countLabel(rows.length)}. This listing is incomplete.`}
        </p>
      )}
      {browser.loading && rows.length === 0 && browser.listing === "Unread" && (
        <div className="flex flex-col gap-2 p-4" aria-busy>{[0, 1, 2].map((n) => <Skeleton key={n} className="h-14" />)}</div>
      )}
      {showsEmpty(browser) && <EmptyState title={emptyTitle} icon={<Folder className="size-10" />} />}
      {grouped ? (
        <ul aria-label="Folders">
          {browser.groups.map((group) => {
            const Icon = kindIcon(group.latestKind);
            return (
              <li key={group.folder}>
                <ListRow title={group.label} detail={group.folder || "Internal storage"} trailing={String(group.count)}
                  leading={<Icon aria-hidden className="size-6 text-muted-foreground" />} aria-label={`Open ${group.label}`} onClick={() => onGroup(group)} />
              </li>
            );
          })}
        </ul>
      ) : (
        <ul aria-label="Files" className={browser.grid ? "grid grid-cols-3 gap-1 p-2" : undefined}>
          {rows.map((row) => {
            const selected = browser.selected.includes(row.key);
            return (
              <li key={row.key}>
                <FileRow row={row} grid={browser.grid} selecting={browser.selecting} selected={selected} showFolder={place.tag === "InCategory" && place.category !== "Downloads"}
                  disabled={browser.mutations > 0 && !browser.selecting}
                  onOpen={() => (browser.selecting ? onToggle(row.key) : onOpen(row))} onPress={canSelect ? () => onToggle(row.key) : undefined} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
