import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "../Button.tsx";

export type BrowserFindBarProps = {
  /** What is being found. */
  value: string;
  /** Told each change of what is being found. */
  onValueChange: (value: string) => void;
  /** Where the search stands: the match shown and how many there are, or none found; empty before anything is typed. */
  status: string;
  /** The match before; absent while there is none. */
  onPrevious?: () => void;
  /** The match after; absent while there is none. */
  onNext?: () => void;
  /** Ends finding and clears the search. */
  onClose: () => void;
};

/** Find in page: a floating field under the Browser's bar, where the matches stand, and a step to each. */
export function BrowserFindBar({ value, onValueChange, status, onPrevious, onNext, onClose }: BrowserFindBarProps) {
  return (
    <div role="search" aria-label="Find in page" className="absolute top-24.5 right-2.5 left-2.5 z-20 flex min-h-13 items-center gap-1 rounded-full bg-card py-1 pr-1 pl-3.5 shadow-lg ring-1 ring-border">
      <input
        ref={(input) => { if (input && input.dataset.focused === undefined) { input.dataset.focused = ""; input.focus({ preventScroll: true }); } }}
        type="search" aria-label="Find in page" placeholder="Find in page" value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); (event.shiftKey ? onPrevious : onNext)?.(); } else if (event.key === "Escape") onClose(); }}
        className="min-h-11 min-w-0 flex-1 border-0 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
      />
      <span role="status" aria-live="polite" className="text-meta whitespace-nowrap text-muted-foreground">{status}</span>
      <Button variant="ghost" size="icon" aria-label="Previous match" disabled={onPrevious === undefined} onClick={onPrevious}><ChevronUp className="size-4.5" /></Button>
      <Button variant="ghost" size="icon" aria-label="Next match" disabled={onNext === undefined} onClick={onNext}><ChevronDown className="size-4.5" /></Button>
      <Button variant="ghost" size="icon" aria-label="Close find in page" onClick={onClose}><X className="size-4.5" /></Button>
    </div>
  );
}
