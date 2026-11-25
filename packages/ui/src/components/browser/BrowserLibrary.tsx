import { ChevronLeft, Star } from "lucide-react";
import { useState } from "react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
import { SearchField } from "../SearchField.tsx";
import { Spinner } from "../Spinner.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../Tabs.tsx";

export interface BrowserLibraryEntry {
  url: string;
  title?: string;
}

export interface BrowserLibraryProps {
  bookmarks: readonly BrowserLibraryEntry[];
  history: readonly BrowserLibraryEntry[];
  loading: boolean;
  failed: boolean;
  onBack: () => void;
  onOpen: (url: string) => void;
  onRetry?: () => void;
}

const sections = ["Bookmarks", "History"] as const;

/** Bookmarks and history from the phone's Browser session. */
export function BrowserLibrary({ bookmarks, history, loading, failed, onBack, onOpen, onRetry }: BrowserLibraryProps) {
  const [query, setQuery] = useState("");
  return (
    <Tabs defaultValue="Bookmarks" onValueChange={() => setQuery("")} className="absolute inset-0 z-50 min-h-0 gap-0 bg-background motion-safe:animate-rise">
      <header data-host-chrome="" className="flex min-h-13 shrink-0 items-center gap-0.5 px-2 in-data-[alpha-launcher]:mt-11 in-data-[alpha-launcher]:min-h-14 in-data-[alpha-launcher]:gap-2 in-data-[alpha-launcher]:pr-3">
        <Button variant="ghost" size="icon" aria-label="Back to page" className="size-13 rounded-lg in-data-[alpha-launcher]:size-11" onClick={onBack}><ChevronLeft /></Button>
        <TabsList aria-label="Browser library" className="gap-0.5 p-0.75">
          {sections.map((section) => <TabsTrigger key={section} value={section} className="min-h-9.5 flex-none data-[state=active]:bg-alpha data-[state=active]:text-alpha-foreground">{section}</TabsTrigger>)}
        </TabsList>
      </header>
      {sections.map((section) => (
        <TabsContent key={section} value={section} className="flex min-h-0 flex-1 flex-col rounded-none data-[state=inactive]:hidden">
          <LibraryList title={section} entries={section === "Bookmarks" ? bookmarks : history} query={query} onQuery={setQuery}
            loading={loading} failed={failed} onRetry={onRetry} onOpen={onOpen} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

type LibraryListProps = Pick<BrowserLibraryProps, "onOpen" | "onRetry" | "loading" | "failed"> & {
  title: typeof sections[number];
  entries: readonly BrowserLibraryEntry[];
  query: string;
  onQuery: (query: string) => void;
};

function LibraryList({ title, entries, query, onQuery, loading, failed, onRetry, onOpen }: LibraryListProps) {
  if (failed) return <div className="flex flex-col items-center gap-3 px-6 py-10" role="status"><p>Could not read the library</p>{onRetry && <Button variant="secondary" onClick={onRetry}>Retry</Button>}</div>;
  if (loading) return <div className="flex justify-center py-10"><Spinner label={`Loading ${title.toLowerCase()}`} /></div>;
  const seeking = query.trim().toLowerCase();
  const visible = entries.filter(({ title, url }) => url.toLowerCase().includes(seeking) || title?.toLowerCase().includes(seeking));
  const label = `Search ${title.toLowerCase()}`;
  return (
    <>
      <SearchField value={query} onValueChange={onQuery} aria-label={label} placeholder={label}
        className="mx-4 mb-1.5 shrink-0 [&>input]:h-11 [&>input]:rounded-full [&>input]:pl-10 [&>svg]:left-3.5 [&>svg]:size-4" />
      <div className="min-h-0 flex-1 overflow-y-auto pt-2 pb-35">
        {title === "History" && visible.length > 0 && <h3 className="mx-5 mt-3.5 mb-1 text-fine font-semibold text-muted-foreground">Earlier</h3>}
        {visible.length > 0 && <ul>{visible.map((entry) => <li key={entry.url}><LibraryRow entry={entry} onOpen={onOpen} /></li>)}</ul>}
        {visible.length === 0 && (seeking
          ? <p role="status" className="px-6 py-10 text-center text-base leading-plain text-muted-foreground">No matches</p>
          : <div role="status" aria-label={`No ${title.toLowerCase()}`} className="flex flex-col items-center gap-2.5 px-6 py-15 text-base leading-plain text-muted-foreground"><Star aria-hidden className="size-7" />Empty</div>)}
      </div>
    </>
  );
}

function LibraryRow({ entry, onOpen }: { entry: BrowserLibraryEntry; onOpen: BrowserLibraryProps["onOpen"] }) {
  const address = URL.parse(entry.url);
  const host = address?.hostname.replace(/^www\./, "") ?? entry.url;
  const where = address ? address.host + (address.pathname === "/" ? "" : address.pathname) + address.search : entry.url;
  const title = entry.title || host;
  return (
    <button type="button" className={cn(focusRing, "flex min-h-14 w-full items-center gap-3.5 py-2 pr-3 pl-5 text-left active:bg-accent")} onClick={() => onOpen(entry.url)}>
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-date">{title.slice(0, 1).toUpperCase()}</span>
      <span className="min-w-0">
        <span className="block truncate text-prose leading-plain">{title}</span>
        <span className="mt-0.5 block truncate text-fine text-muted-foreground">{where}</span>
      </span>
    </button>
  );
}
