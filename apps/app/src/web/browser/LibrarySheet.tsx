// spec/browser/bookmarks.md, "A read replaces the marks with the store's list, keeping each saved name, and a failed read is reported, or offered for recovery once when the list is damaged"; spec/browser/session.md, "Only a normal tab's committed web page enters history, newest first, at most one hundred"
import { X } from "lucide-react";
import { useState } from "react";
import type { Bookmarks } from "../../../gen/browser__bookmarks.ts";
import { type Session, canClearHistory } from "../../../gen/browser__session.ts";
import { Button, EmptyState, Input, ListRow, Sheet, SheetContent, Tabs, TabsList, TabsTrigger } from "../components/ui/index.ts";

/** The history and bookmarks the library lists, and what the owner does with a row. */
export interface LibrarySheetProps {
  session: Session;
  bookmarks: Bookmarks;
  onShelf: (shelf: "BookmarksList" | "HistoryList") => void;
  /** Opens a saved page in the selected tab. */
  onOpen: (url: string) => void;
  onRemoveMark: (url: string) => void;
  onRemoveVisit: (url: string) => void;
  onClearHistory: () => void;
  onRecover: () => void;
  onDismiss: () => void;
  /** The moment history is grouped against, in milliseconds; now by default. */
  today?: number;
}

/** Visits within this many local days of today sit under their day; older ones under their month. */
const DAY_HEADER_WINDOW = 30;

function startOfDay(at: number): number {
  const d = new Date(at);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** The local day of a visit: Today, Yesterday, the day for the last month, then the month. */
function dayOf(at: number, today: number): string {
  if (at <= 0) return "Earlier";
  const days = Math.round((startOfDay(today) - startOfDay(at)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  const d = new Date(at);
  if (days < DAY_HEADER_WINDOW) {
    const year = d.getFullYear() !== new Date(today).getFullYear();
    return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", ...(year ? { year: "numeric" } : {}) });
  }
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/**
 * Bookmarks and history, searchable by address or name; history sits under the day of each visit.
 * @model spec/browser/bookmarks.md
 */
export function LibrarySheet({ session, bookmarks, onShelf, onOpen, onRemoveMark, onRemoveVisit, onClearHistory, onRecover, onDismiss, today = Date.now() }: LibrarySheetProps) {
  const [query, setQuery] = useState("");
  const history = session.layers.library === "HistoryList";
  const wanted = query.trim().toLocaleLowerCase();
  const rows = (history ? session.visits.map((v) => ({ url: v.url, title: v.title, at: v.at })) : bookmarks.marks.map((m) => ({ url: m.url, title: m.title, at: 0 })))
    .filter((r) => !wanted || `${r.url} ${r.title}`.toLocaleLowerCase().includes(wanted));
  let section = "";
  return (
    <Sheet open={session.layers.library !== "NoLibrary"} onOpenChange={(open) => { if (!open) onDismiss(); }}>
      <SheetContent side="full" title={history ? "History" : "Bookmarks"} hideTitle>
        <Tabs value={history ? "HistoryList" : "BookmarksList"} onValueChange={(value) => onShelf(value === "HistoryList" ? "HistoryList" : "BookmarksList")} className="px-4">
          <TabsList aria-label="Library">
            <TabsTrigger value="BookmarksList">Bookmarks</TabsTrigger>
            <TabsTrigger value="HistoryList">History</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="px-4"><Input aria-label={history ? "Search history" : "Search bookmarks"} value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {!history && bookmarks.recovery && <li><ListRow title="Recover saved bookmarks" detail="Bookmarks unavailable" onClick={onRecover} /></li>}
          {rows.map((row) => {
            const url = URL.parse(row.url);
            const site = url?.hostname.replace(/^www\./, "") ?? row.url;
            const day = history ? dayOf(row.at, today) : "";
            const heading = day !== section ? day : "";
            section = day;
            return (
              <li key={row.url}>
                {heading && <h3 className="px-4 pt-3 font-mono text-xs uppercase text-muted-foreground">{heading}</h3>}
                <div className="flex items-center">
                  <ListRow className="flex-1" title={row.title || site} detail={`${url?.host ?? ""}${url && url.pathname !== "/" ? url.pathname : ""}${url?.search ?? ""}`} onClick={() => onOpen(row.url)} />
                  <Button variant="ghost" size="icon" aria-label={history ? "Remove from history" : "Remove bookmark"} onClick={() => (history ? onRemoveVisit(row.url) : onRemoveMark(row.url))}><X aria-hidden /></Button>
                </div>
              </li>
            );
          })}
        </ul>
        {rows.length === 0 && !(bookmarks.recovery && !history) && <EmptyState title={wanted ? "No matches" : history ? "No history" : "No bookmarks"} />}
        {history && <div className="px-4 pb-4"><Button variant="destructive" className="w-full" disabled={!canClearHistory(session)} onClick={onClearHistory}>Clear history</Button></div>}
      </SheetContent>
    </Sheet>
  );
}
