import { ChevronLeft, Star, Trash2, X } from "lucide-react";
import { useState } from "react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
import { Spinner } from "../Spinner.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../Tabs.tsx";

export interface BrowserLibraryEntry {
  url: string;
  title?: string;
}

export interface BrowserHistoryRange {
  /** Names the range. */
  id: string;
  /** What the time range picker says. */
  label: string;
}

export interface BrowserLibraryProps {
  bookmarks: readonly BrowserLibraryEntry[];
  history: readonly BrowserLibraryEntry[];
  loading: boolean;
  failed: boolean;
  onBack: () => void;
  onOpen: (url: string) => void;
  onRemoveBookmark?: (entry: BrowserLibraryEntry) => void;
  onRemoveHistory?: (entry: BrowserLibraryEntry) => void;
  /** The time ranges history can be cleared over, the first chosen at first. */
  historyRanges?: readonly BrowserHistoryRange[];
  /** Clears history over the chosen range; absent while history cannot be cleared. */
  onClearHistory?: (range: string) => void;
  /** Asks to clear every kind of browsing data; absent while that cannot be asked. */
  onResetData?: () => void;
  onRetry?: () => void;
}

const sections = ["Bookmarks", "History"] as const;

/**
 * Bookmarks and history from the phone's Browser session, as v119 (Alpha 45f6bed30
 * apps/app/src/prototype/template.html:1802-1846): the back control and the Bookmarks and History segments in a 56px
 * header, and on History a trash button that opens the time range for clearing history, with Reset browser data.
 */
export function BrowserLibrary({ bookmarks, history, loading, failed, onBack, onOpen, onRemoveBookmark, onRemoveHistory, historyRanges = [], onClearHistory, onResetData, onRetry }: BrowserLibraryProps) {
  const [section, setSection] = useState<typeof sections[number]>("Bookmarks");
  const [clearOpen, setClearOpen] = useState(false);
  const [range, setRange] = useState(historyRanges[0]?.id ?? "");
  const historyShown = section === "History";
  return (
    <Tabs value={section} onValueChange={(value) => { setSection(value as typeof section); setClearOpen(false); }} className="absolute inset-0 z-50 min-h-0 gap-0 bg-background motion-safe:animate-rise">
      <header data-host-chrome="" className="flex min-h-13 shrink-0 items-center gap-0.5 px-2 in-data-[alpha-launcher]:mt-11 in-data-[alpha-launcher]:min-h-14 in-data-[alpha-launcher]:gap-2 in-data-[alpha-launcher]:pr-3">
        <Button variant="ghost" size="icon" aria-label="Back to page" className="size-13 rounded-lg in-data-[alpha-launcher]:size-11" onClick={onBack}><ChevronLeft /></Button>
        <TabsList aria-label="Browser library" className="gap-0.5 p-0.75">
          {sections.map((one) => <TabsTrigger key={one} value={one} className="min-h-9.5 flex-none data-[state=active]:bg-alpha data-[state=active]:text-alpha-foreground">{one}</TabsTrigger>)}
        </TabsList>
        {historyShown && (onClearHistory || onResetData) && (
          <Button variant="ghost" size="icon" aria-label="Clear history" aria-expanded={clearOpen} aria-controls="alpha-history-clear" className="ml-auto rounded-full" onClick={() => setClearOpen(!clearOpen)}>
            <Trash2 aria-hidden />
          </Button>
        )}
      </header>
      {sections.map((one) => (
        <TabsContent key={one} value={one} className="flex min-h-0 flex-1 flex-col rounded-none data-[state=inactive]:hidden">
          <div className="min-h-0 flex-1 overflow-y-auto pt-2 pb-35">
            {one === "History" && clearOpen && (
              <div id="alpha-history-clear" role="group" aria-label="Clear history options" className="mx-5 mt-1 mb-2.5 flex flex-col gap-2 rounded-[1.25rem] bg-secondary p-3.5">
                <label htmlFor="alpha-history-range" className="text-sm font-semibold">Time range</label>
                <div className="flex flex-wrap gap-2">
                  <select id="alpha-history-range" value={range} onChange={(event) => setRange(event.currentTarget.value)}
                    className={cn(focusRing, "min-h-11 min-w-32.5 flex-1 rounded-[0.875rem] border-0 bg-background px-3 text-foreground")}>
                    {historyRanges.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}
                  </select>
                  <button type="button" onClick={() => onClearHistory?.(range)} disabled={onClearHistory === undefined} className={cn(focusRing, "min-h-11 rounded-[0.875rem] bg-foreground px-3.5 font-semibold text-background disabled:opacity-50")}>Clear history</button>
                </div>
                {onResetData && <button type="button" onClick={onResetData} className={cn(focusRing, "min-h-11 self-start text-left text-sm text-muted-foreground")}>Reset browser data</button>}
              </div>
            )}
            <LibraryList title={one} entries={one === "Bookmarks" ? bookmarks : history}
              loading={loading} failed={failed} onRetry={onRetry} onOpen={onOpen}
              onRemove={one === "Bookmarks" ? onRemoveBookmark : onRemoveHistory} />
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

type LibraryListProps = Pick<BrowserLibraryProps, "onOpen" | "onRetry" | "loading" | "failed"> & {
  onRemove?: (entry: BrowserLibraryEntry) => void;
  title: typeof sections[number];
  entries: readonly BrowserLibraryEntry[];
};

function LibraryList({ title, entries, loading, failed, onRetry, onOpen, onRemove }: LibraryListProps) {
  if (failed) return <div className="flex flex-col items-center gap-3 px-6 py-10" role="status"><p>Could not read the library</p>{onRetry && <Button variant="secondary" onClick={onRetry}>Retry</Button>}</div>;
  if (loading) return <div className="flex justify-center py-10"><Spinner label={`Loading ${title.toLowerCase()}`} /></div>;
  if (entries.length === 0) return <div role="status" aria-label={`No ${title.toLowerCase()}`} className="flex flex-col items-center gap-2.5 px-6 py-15 text-center text-body text-muted-foreground"><Star aria-hidden className="size-7" />Empty</div>;
  return (
    <ul>{entries.map((entry) => (
      <li key={entry.url} className="flex items-center pr-2.5">
        <LibraryRow entry={entry} onOpen={onOpen} />
        {onRemove && <Button variant="ghost" size="icon" aria-label={`${title === "Bookmarks" ? "Remove bookmark" : "Remove from history"} ${entry.title || entry.url}`}
          className="size-11 shrink-0 rounded-full text-muted-foreground" onClick={() => onRemove(entry)}><X className="size-4.5" /></Button>}
      </li>
    ))}</ul>
  );
}

function LibraryRow({ entry, onOpen }: { entry: BrowserLibraryEntry; onOpen: BrowserLibraryProps["onOpen"] }) {
  const address = URL.parse(entry.url);
  const host = address?.hostname.replace(/^www\./, "") ?? entry.url;
  const where = address ? address.host + (address.pathname === "/" ? "" : address.pathname) + address.search : entry.url;
  const title = entry.title || host;
  return (
    <button type="button" className={cn(focusRing, "flex min-h-14 min-w-0 flex-1 items-center gap-3.5 py-2 pr-3 pl-5 text-left active:bg-accent")} onClick={() => onOpen(entry.url)}>
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full font-display text-date">{title.slice(0, 1)}</span>
      <span className="min-w-0">
        <span className="block truncate text-prose leading-plain">{title}</span>
        <span className="mt-0.5 block truncate text-fine text-muted-foreground">{where}</span>
      </span>
    </button>
  );
}
