// spec/browser/session.md, "Selecting a tab from the switcher closes it, and closing the selected tab selects the first one left"; spec/browser/session.md, "A new tab, normal or private, opens selected with its address field, unless eight are open"
import { Plus, X } from "lucide-react";
import { type BrowserTab, type Session, full } from "../../../gen/browser__session.ts";
import { Button, SheetContent, Sheet } from "../components/ui/index.ts";
import { cn, focusRing } from "../lib/cn.ts";

/** The tabs the switcher shows, and the owner's pick, close and new-tab actions. */
export interface TabSwitcherProps {
  session: Session;
  onPick: (id: string) => void;
  onCloseTab: (id: string) => void;
  /** A new normal or private tab. */
  onNewTab: (priv: boolean) => void;
  onDismiss: () => void;
}

function label(tab: BrowserTab): { title: string; host: string } {
  const url = tab.page.url || tab.restoreUrl;
  const title = tab.page.title || tab.restoreTitle;
  const blank = tab.profile === "Private" ? "New private tab" : "New tab";
  return { title: title || url || blank, host: URL.parse(url)?.host ?? "" };
}

/**
 * Every open tab as a card; the selected one is outlined and private ones are dark.
 * @model spec/browser/session.md
 */
export function TabSwitcher({ session, onPick, onCloseTab, onNewTab, onDismiss }: TabSwitcherProps) {
  const atLimit = full(session);
  return (
    <Sheet open={session.layers.tabsOpen} onOpenChange={(open) => { if (!open) onDismiss(); }}>
      <SheetContent side="full" title={session.tabs.length === 1 ? "1 tab" : `${session.tabs.length} tabs`}>
        <ul className="grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto px-4">
          {session.tabs.map((tab) => {
            const { title, host } = label(tab);
            const priv = tab.profile === "Private";
            return (
              <li key={tab.id} className={cn("relative flex h-36 flex-col rounded-lg border border-border", priv ? "bg-foreground text-background" : "bg-card", tab.id === session.cur && "ring-2 ring-primary")}>
                <button type="button" aria-current={tab.id === session.cur || undefined} aria-label={`Switch to ${priv ? "private tab " : ""}${title}`} onClick={() => onPick(tab.id)} className={cn(focusRing, "flex flex-1 flex-col justify-end gap-1 rounded-lg p-3 text-left")}>
                  <span className="line-clamp-2 text-sm font-medium">{title}</span>
                  <span className="truncate font-mono text-xs uppercase opacity-70">{priv ? "Private" : host}</span>
                </button>
                <Button variant="ghost" size="icon" aria-label={priv ? "Close private tab" : "Close tab"} onClick={() => onCloseTab(tab.id)} className="absolute right-1 top-1"><X aria-hidden /></Button>
              </li>
            );
          })}
        </ul>
        <div className="flex gap-2 px-4 pb-4">
          <Button className="flex-1" disabled={atLimit} onClick={() => onNewTab(false)}><Plus aria-hidden />New tab</Button>
          <Button className="flex-1" variant="secondary" disabled={atLimit} onClick={() => onNewTab(true)}><Plus aria-hidden />Private</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
