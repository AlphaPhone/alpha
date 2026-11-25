import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Ellipsis, Lock, X } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
import { PrivateMark } from "./PrivateMark.tsx";

export type BrowserBarProps = {
  /** The control that leaves the Browser, shown first. */
  leading?: ReactNode;
  /** The page's host; empty for a tab with no page, which shows the address bar's hint instead. */
  host: string;
  /** The rest of the page's address after its host. */
  path?: string;
  /** Whether the page came over a secure connection. */
  secure?: boolean;
  /** Whether the tab is private. */
  private?: boolean;
  /** How many tabs are open. */
  tabs: number;
  /** Opens the address for editing; absent while it cannot be edited. */
  onEdit?: () => void;
  /** Stops the page loading; shown only while it loads. */
  onStop?: () => void;
  /** The tab's page before; dimmed and refused while there is none. */
  onBack?: () => void;
  /** The tab's page after; dimmed and refused while there is none. */
  onForward?: () => void;
  /** Opens the tab switcher. */
  onTabs?: () => void;
  /** Opens the Browser's menu. */
  onMenu?: () => void;
};

const pageControl = "h-13 w-11 rounded-full disabled:opacity-30";

/** The Browser's bar: the way out, the page's address, its back and forward, the open tabs and the menu. */
export function BrowserBar({ leading, host, path = "", secure = false, private: privateTab = false, tabs, onEdit, onStop, onBack, onForward, onTabs, onMenu }: BrowserBarProps) {
  return (
    <header data-host-chrome="" className="relative z-10 flex h-13 shrink-0 items-center bg-background pr-2 [&>div:first-child>button]:size-13 [&>div:first-child>button]:rounded-lg">
      <div className="flex shrink-0">{leading}</div>
      <button type="button" aria-label="Edit address" onClick={onEdit} disabled={onEdit === undefined}
        className="mx-0.5 flex h-11 min-w-0 flex-1 items-center rounded-full bg-secondary px-3.5 text-sm">
        {privateTab && <PrivateMark className="mr-2 size-4.5 shrink-0" />}
        {secure && <Lock role="img" aria-label="Secure connection" className="mr-1.5 size-3.25 shrink-0 text-muted-foreground" />}
        <span className={cn("min-w-0 truncate", host === "" && "text-muted-foreground")}>{host === "" ? "Search or address" : host}</span>
        <span className="truncate text-muted-foreground">{path}</span>
      </button>
      <div role="group" aria-label="Page navigation" className="flex shrink-0">
        {onStop && <Button variant="ghost" size="icon" aria-label="Stop loading" className="h-13 w-11" onClick={onStop}><X /></Button>}
        <Button variant="ghost" size="icon" aria-label="Previous page" className={pageControl} disabled={onBack === undefined} onClick={onBack}><ArrowLeft className="size-5" /></Button>
        <Button variant="ghost" size="icon" aria-label="Next page" className={pageControl} disabled={onForward === undefined} onClick={onForward}><ArrowRight className="size-5" /></Button>
      </div>
      <Button variant="ghost" size="icon" aria-label="Tabs" className="h-13 w-11" onClick={onTabs} disabled={onTabs === undefined}>
        <span className="flex size-5.25 items-center justify-center rounded-tab-count border-[1.6px] border-current px-0.75 text-tab-count font-bold">{tabs}</span>
      </Button>
      <Button variant="ghost" size="icon" aria-label="Menu" className="h-13 w-11" onClick={onMenu} disabled={onMenu === undefined}><Ellipsis /></Button>
    </header>
  );
}
