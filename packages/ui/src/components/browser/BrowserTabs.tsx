import type { ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";

export type BrowserTabCard = {
  /** The tab's number, which keys it. */
  id: number;
  /** The page's title, or what the tab is where it has none. */
  title: string;
  /** Where the page is, under its title. */
  where: string;
  /** Whether it is the tab shown. */
  current?: boolean;
  /** Whether the tab is private, which darkens its preview. */
  private?: boolean;
};

export type BrowserTabsProps = {
  /** The control that goes back to the page, shown first. */
  leading?: ReactNode;
  /** The open tabs, in the order they were opened. */
  tabs: BrowserTabCard[];
  /** Shows a tab; absent while tabs cannot be picked. */
  onPick?: (id: number) => void;
  /** Closes a tab; absent while tabs cannot be closed. */
  onClose?: (id: number) => void;
  /** Opens a new tab; absent while no more can open. */
  onNew?: () => void;
  /** Opens a new private tab; absent while no more can open. */
  onNewPrivate?: () => void;
};

/** Every open tab as a card, the one shown outlined, with a new tab and a new private tab. */
export function BrowserTabs({ leading, tabs, onPick, onClose, onNew, onNewPrivate }: BrowserTabsProps) {
  return (
    <div className="absolute inset-0 z-50 flex animate-rise flex-col bg-background">
      <header data-host-chrome="" className="flex h-13 shrink-0 items-center px-2 [&>div:first-child>button]:size-13 [&>div:first-child>button]:rounded-lg">
        <div className="flex shrink-0">{leading}</div>
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold">{tabs.length === 1 ? "1 tab" : `${tabs.length} tabs`}</h1>
        {onNewPrivate && <button type="button" aria-label="New private tab" onClick={onNewPrivate} className={cn(focusRing, "min-h-9 rounded-full bg-secondary px-3 text-snippet font-semibold")}>Private</button>}
        <Button variant="ghost" size="icon" aria-label="New tab" className="size-13 rounded-lg" onClick={onNew} disabled={onNew === undefined}><Plus /></Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1.5 pb-35">
        <div className="grid grid-cols-2 gap-3">
          {tabs.map((tab) => (
            <div key={tab.id} className={cn("relative overflow-hidden rounded-tile bg-secondary p-1.5", tab.current && "ring-2 ring-alpha ring-inset")}>
              <button type="button" aria-label={`Switch to ${tab.title}`} onClick={() => onPick?.(tab.id)} disabled={onPick === undefined} className={cn(focusRing, "block w-full text-left")}>
                <div className={cn("h-37.5 rounded-lg border border-border", tab.private ? "bg-foreground opacity-85" : "bg-secondary")} />
                <div className="p-2">
                  <div className="truncate text-snippet font-semibold">{tab.title}</div>
                  <div className="mt-0.5 text-xs break-all text-muted-foreground">{tab.where}</div>
                </div>
              </button>
              {onClose && (
                <button type="button" aria-label={`Close ${tab.title}`} onClick={() => onClose(tab.id)}
                  className={cn(focusRing, "absolute top-2 right-2 flex size-11 items-center justify-center rounded-full bg-secondary text-foreground")}><X className="size-4" /></button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
