// spec/browser/session.md, "Typing changes the query, and a debounced search reaches only the tab that still shows the bar, with the query it still holds"; spec/browser/session.md, "Next and previous step through matches only when there are matches, and closing clears the native search"
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BROWSER_FIND_TEXT_MAX } from "@elizaos/plugin-browser/contract";
import { type Session, canMoveFind } from "../../../gen/browser__session.ts";
import { Button, Input } from "../components/ui/index.ts";
import { HOST_CHROME } from "./measure.ts";

/** The find bar's session, and the owner's query, steps and close. */
export interface FindBarProps {
  session: Session;
  onQuery: (query: string) => void;
  onMove: (forward: boolean) => void;
  onClose: () => void;
}

/**
 * Find in page over the selected tab: the query, where the current match is, and next and previous.
 * @model spec/browser/session.md
 */
export function FindBar({ session, onQuery, onMove, onClose }: FindBarProps) {
  const { find } = session;
  const [query, setQuery] = useState(find.query);
  // The queries this bar sent and has not yet seen come back; any other query, such as one the agent put into an
  // open bar, is shown in it, and the owner's own typing is never overwritten by its echo.
  const sent = useRef<string[]>([find.query]);
  useEffect(() => {
    if (sent.current.includes(find.query)) return;
    sent.current = [find.query];
    setQuery(find.query);
  }, [find.query]);
  const status = !find.query ? "" : find.count ? `${find.index || 1} of ${find.count}` : find.done ? "No matches" : "Searching…";
  return (
    <div {...{ [HOST_CHROME]: "" }} role="search" aria-label="Find in page" className="flex items-center gap-1 border-b border-border bg-background px-2 py-1">
      <Input autoFocus aria-label="Find in page" value={query} maxLength={BROWSER_FIND_TEXT_MAX} className="flex-1"
        onChange={(event) => { sent.current = [...sent.current.slice(-31), event.target.value]; setQuery(event.target.value); onQuery(event.target.value); }}
        onKeyDown={(event) => {
          if (event.key === "Enter") { event.preventDefault(); if (canMoveFind(session, !event.shiftKey)) onMove(!event.shiftKey); }
          else if (event.key === "Escape") { event.preventDefault(); onClose(); }
        }} />
      <span role="status" className="min-w-16 text-right font-mono text-xs uppercase tabular-nums text-muted-foreground">{status}</span>
      <Button variant="ghost" size="icon" aria-label="Previous match" disabled={!canMoveFind(session, false)} onClick={() => onMove(false)}><ChevronUp aria-hidden /></Button>
      <Button variant="ghost" size="icon" aria-label="Next match" disabled={!canMoveFind(session, true)} onClick={() => onMove(true)}><ChevronDown aria-hidden /></Button>
      <Button variant="ghost" size="icon" aria-label="Close find" onClick={onClose}><X aria-hidden /></Button>
    </div>
  );
}
