// spec/browser/session.md, "Find opens on a committed page of the native host's selected tab and closes the menu"; spec/browser/egress.md, "Bookmark toggles the mark of a settled HTTPS page, and otherwise says only HTTPS pages can be bookmarked"; spec/browser/handoff.md, "A handoff binds the selected tab's settled HTTPS page, and every later step needs that page still shown"; spec/browser/site.md, "Clearing a site removes its cookies and decisions in the tab's own profile only"; spec/browser/reading.md, "A reading is bound to the shown page it was asked for, and the device's support is asked once"
import { BookOpen, Bookmark, Download, ExternalLink, Eraser, KeyRound, Library, MessageSquare, Plus, Search, Share2, Trash2, Volume2 } from "lucide-react";
import type { ReactNode } from "react";
import type { Reading } from "../../../gen/browser__reading.ts";
import { settled } from "../../../gen/browser__page.ts";
import { mayClearSite } from "../../../gen/browser__site.ts";
import { type Session, canOpenFind, curTab, full } from "../../../gen/browser__session.ts";
import { Sheet, SheetContent } from "../components/ui/index.ts";
import { cn, focusRing } from "../lib/cn.ts";

/** One thing the owner can do from Browser's menu. */
export type MenuAction =
  | "newTab" | "newPrivateTab" | "library" | "find" | "bookmark" | "share" | "readAloud" | "askAboutPage" | "readLocally"
  | "external" | "downloads" | "passwords" | "clearSite" | "clearData";

/** The session and reading the menu offers its items from, and where a chosen item goes. */
export interface BrowserMenuProps {
  session: Session;
  reading: Reading;
  /** Whether the selected page is bookmarked. */
  marked: boolean;
  onAction: (action: MenuAction) => void;
  onDismiss: () => void;
}

function Item({ icon, label, onSelect, disabled = false, destructive = false }: { icon: ReactNode; label: string; onSelect: () => void; disabled?: boolean; destructive?: boolean }) {
  return (
    <li>
      <button type="button" role="menuitem" disabled={disabled} onClick={onSelect} className={cn(focusRing, "flex min-h-12 w-full items-center gap-3 px-5 text-left disabled:opacity-50", destructive && "text-destructive")}>
        <span aria-hidden className="size-5">{icon}</span>{label}
      </button>
    </li>
  );
}

/**
 * Browser's menu: tabs, the library, the page's own actions and the site's data.
 * @model spec/browser/session.md
 */
export function BrowserMenu({ session, reading, marked, onAction, onDismiss }: BrowserMenuProps) {
  const tab = curTab(session);
  const onDevice = session.host === "NativeHost";
  const loaded = tab.stage === "Live" && settled(tab.page);
  const reads = reading.support !== "Unsupported";
  const act = (action: MenuAction) => () => onAction(action);
  return (
    <Sheet open={session.layers.menu} onOpenChange={(open) => { if (!open) onDismiss(); }}>
      <SheetContent side="bottom" title="Browser menu" hideTitle>
        <ul role="menu" aria-label="Browser menu" className="max-h-[70dvh] overflow-y-auto pb-4">
          <Item icon={<Plus />} label="New tab" disabled={full(session)} onSelect={act("newTab")} />
          <Item icon={<Plus />} label="New private tab" disabled={full(session)} onSelect={act("newPrivateTab")} />
          <Item icon={<Library />} label="Bookmarks and history" onSelect={act("library")} />
          {onDevice && <Item icon={<Search />} label="Find in page" disabled={!canOpenFind(session)} onSelect={act("find")} />}
          <Item icon={<Bookmark className={cn(marked && "fill-current")} />} label={marked ? "Bookmarked" : "Bookmark"} disabled={!loaded} onSelect={act("bookmark")} />
          <Item icon={<Share2 />} label="Share" disabled={!loaded} onSelect={act("share")} />
          {onDevice && <Item icon={<Volume2 />} label={reading.phase === "NotReading" ? "Read aloud" : "Stop reading"} disabled={!reads || (!loaded && reading.phase === "NotReading")} onSelect={act("readAloud")} />}
          {!onDevice && <Item icon={<BookOpen />} label="Read aloud" disabled={!loaded} onSelect={act("readLocally")} />}
          <Item icon={<MessageSquare />} label="Ask about page" disabled={!reads || !loaded} onSelect={act("askAboutPage")} />
          {onDevice && <Item icon={<ExternalLink />} label="Open in another browser" disabled={!loaded || !tab.page.secure} onSelect={act("external")} />}
          {onDevice && <Item icon={<Download />} label="Downloads" onSelect={act("downloads")} />}
          <Item icon={<KeyRound />} label="Passwords" onSelect={act("passwords")} />
          {onDevice && <Item icon={<Eraser />} label="Clear site data" disabled={!mayClearSite({ nativeHost: onDevice, committed: tab.page.committed, failed: tab.page.failed, hasHost: (URL.parse(tab.page.url)?.hostname ?? "") !== "" })} onSelect={act("clearSite")} />}
          <Item icon={<Trash2 />} label="Clear browsing data" destructive disabled={session.clearing} onSelect={act("clearData")} />
        </ul>
      </SheetContent>
    </Sheet>
  );
}
