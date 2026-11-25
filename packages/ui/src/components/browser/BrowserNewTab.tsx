import { Globe, Search } from "lucide-react";
import { PrivateNotice } from "./PrivateNotice.tsx";

export type BrowserSite = {
  /** The site's host, which names it. */
  host: string;
  /** The site's own color behind its initial; the surface color where it has none. */
  tone?: "ink" | "blue" | "green";
};

export type BrowserNewTabProps = {
  /** Whether the tab is private, which says what it keeps. */
  private?: boolean;
  /** Opens the address for typing. */
  onSearch?: () => void;
  /** The sites visited last, newest first. */
  recent?: BrowserSite[];
  /** Opens a recent site. */
  onOpen?: (host: string) => void;
};

const tones = { ink: "bg-foreground text-background", blue: "bg-alpha text-alpha-foreground", green: "bg-call text-alpha-foreground" } as const;

/** A tab with no page: where to search or type an address, and the sites visited last. */
export function BrowserNewTab({ private: privateTab = false, onSearch, recent = [], onOpen }: BrowserNewTabProps) {
  return (
    <div className="flex flex-col items-center gap-7.5 px-6 pt-27.5 pb-35">
      <span className="flex size-18 items-center justify-center rounded-full bg-secondary"><Globe aria-hidden className="size-7.5" /></span>
      <h2 className="font-display text-title">New tab</h2>
      {privateTab && <PrivateNotice className="-mt-3.5 text-center" />}
      <button type="button" aria-label="Search or type address" onClick={onSearch} disabled={onSearch === undefined}
        className="flex min-h-14 w-full items-center gap-3 rounded-full bg-secondary px-5 text-body text-muted-foreground">
        <Search aria-hidden className="size-4.5" /><span>Search or type address</span>
      </button>
      {recent.length > 0 && (
        <div className="grid w-full grid-cols-4 gap-x-2 gap-y-3.5">
          {recent.map((site) => (
            <button key={site.host} type="button" aria-label={site.host} onClick={() => onOpen?.(site.host)} className="flex min-w-0 flex-col items-center gap-2">
              <span className={`flex size-13.5 items-center justify-center rounded-full font-display text-2xl ${site.tone ? tones[site.tone] : "bg-secondary"}`}>{site.host.charAt(0).toUpperCase()}</span>
              <span className="max-w-full truncate text-2xs text-muted-foreground">{site.host}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
