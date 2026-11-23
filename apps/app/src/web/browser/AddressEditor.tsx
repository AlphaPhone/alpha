// spec/browser/session.md, "Enter loads what the owner typed in the selected tab, and closes every layer but the find bar"; spec/browser/page.md, "Typed text opens an address, opens the local development host, searches, or is refused"
import { Bookmark, Clock, X } from "lucide-react";
import { useState } from "react";
import type { Mark } from "../../../gen/browser__bookmarks.ts";
import { type Session, curTab } from "../../../gen/browser__session.ts";
import { Button, Input, ListRow } from "../components/ui/index.ts";
import { HOST_CHROME } from "./measure.ts";

/** What the address editor shows and where the owner's Enter and Cancel go. */
export interface AddressEditorProps {
  session: Session;
  /** Saved bookmarks, offered as suggestions. */
  marks: readonly Mark[];
  /** Enter on what the owner typed. */
  onSubmit: (text: string) => void;
  /** Escape or Cancel. */
  onCancel: () => void;
}

/**
 * The address field over the page, with suggestions from bookmarks and, outside private tabs, history. Nothing typed leaves the phone before Enter.
 * @model spec/browser/session.md
 */
export function AddressEditor({ session, marks, onSubmit, onCancel }: AddressEditorProps) {
  const tab = curTab(session);
  const priv = tab.profile === "Private";
  const [text, setText] = useState(tab.page.url);
  const wanted = text.trim().toLocaleLowerCase();
  const candidates = [...marks.map((m) => ({ url: m.url, marked: true })), ...(priv ? [] : session.visits.map((v) => ({ url: v.url, marked: false })))];
  const suggestions = candidates
    .filter((c, i) => candidates.findIndex((d) => d.url === c.url) === i && (!wanted || c.url.toLocaleLowerCase().includes(wanted)))
    .slice(0, 8)
    .flatMap((c) => { const url = URL.parse(c.url); return url ? [{ ...c, host: url.hostname, path: url.pathname + url.search }] : []; });
  return (
    <div {...{ [HOST_CHROME]: "" }} role="search" aria-label="Address" className="absolute inset-0 z-10 flex flex-col bg-background">
      <form className="flex items-center gap-2 p-3" onSubmit={(event) => { event.preventDefault(); onSubmit(text); }}>
        <Input autoFocus aria-label={priv ? "Search or address, private" : "Search or address"} value={text} onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onCancel(); } }} enterKeyHint="go" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="flex-1" />
        {text && <Button variant="ghost" size="icon" aria-label="Clear address" onClick={() => setText("")}><X aria-hidden /></Button>}
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </form>
      {priv && <p className="px-4 pb-2 font-mono text-xs uppercase text-muted-foreground">Private · cleared on close</p>}
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {suggestions.map((s) => (
          <li key={s.url}>
            <ListRow title={s.host} detail={s.path} leading={s.marked ? <Bookmark aria-label="Bookmark" className="size-5" /> : <Clock aria-label="History" className="size-5" />} onClick={() => onSubmit(s.url)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
