// spec/browser/session.md, "The toolbar's back, forward, reload and stop act on the selected tab's page only when it can"; spec/browser/session.md, "Opening the menu, the switcher or the library ends address editing, and the menu never covers editing"
import { ArrowLeft, ArrowRight, EllipsisVertical, Lock, RotateCw, X } from "lucide-react";
import { type Session, canRunCommand, curTab } from "../../../gen/browser__session.ts";
import { Button } from "../components/ui/index.ts";
import { cn, focusRing } from "../lib/cn.ts";
import { HOST_CHROME } from "./measure.ts";

export interface BrowserToolbarProps {
  session: Session;
  /** Back, forward, reload or stop on the selected tab's page. */
  onCommand: (command: "GoBack" | "GoForward" | "Reload" | "StopLoading") => void;
  /** Opens the address field. */
  onAddress: () => void;
  /** Opens the tab switcher. */
  onTabs: () => void;
  /** Opens or closes the menu. */
  onMenu: () => void;
}

/**
 * Browser's bottom bar: history, the selected page's host, the tab count and the menu.
 * @model spec/browser/session.md
 */
export function BrowserToolbar({ session, onCommand, onAddress, onTabs, onMenu }: BrowserToolbarProps) {
  const tab = curTab(session);
  const url = URL.parse(tab.page.url || tab.restoreUrl);
  const priv = tab.profile === "Private";
  const loading = tab.page.loading;
  const secure = session.host === "NativeHost" && url?.protocol === "https:" && tab.page.committed && !loading && !tab.page.failed;
  return (
    <nav {...{ [HOST_CHROME]: "" }} aria-label="Browser" className="flex h-14 items-center gap-1 rounded-t-xl border-t border-border bg-background px-2">
      <Button variant="ghost" size="icon" aria-label="Back" disabled={!canRunCommand(session, "GoBack")} onClick={() => onCommand("GoBack")}><ArrowLeft aria-hidden /></Button>
      <Button variant="ghost" size="icon" aria-label="Forward" disabled={!canRunCommand(session, "GoForward")} onClick={() => onCommand("GoForward")}><ArrowRight aria-hidden /></Button>
      <button type="button" onClick={onAddress} aria-label={url ? `Address ${url.host}` : priv ? "New private tab" : "New tab"} className={cn(focusRing, "flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md bg-secondary px-3 text-left")}>
        {secure && <Lock aria-label="Secure connection" className="size-4 shrink-0 text-ok" />}
        {priv && <span className="font-mono text-xs uppercase text-primary">Private</span>}
        <span className={cn("truncate", !url && "text-muted-foreground")}>{url?.host ?? (priv ? "New private tab" : "Search or address")}</span>
      </button>
      {loading
        ? <Button variant="ghost" size="icon" aria-label="Stop loading" disabled={!canRunCommand(session, "StopLoading")} onClick={() => onCommand("StopLoading")}><X aria-hidden /></Button>
        : <Button variant="ghost" size="icon" aria-label="Reload" disabled={!canRunCommand(session, "Reload")} onClick={() => onCommand("Reload")}><RotateCw aria-hidden /></Button>}
      <Button variant="outline" size="icon" aria-label={session.tabs.length === 1 ? "1 tab" : `${session.tabs.length} tabs`} onClick={onTabs} className="font-mono tabular-nums">{session.tabs.length}</Button>
      <Button variant="ghost" size="icon" aria-label="Browser menu" aria-expanded={session.layers.menu} onClick={onMenu}><EllipsisVertical aria-hidden /></Button>
    </nav>
  );
}
