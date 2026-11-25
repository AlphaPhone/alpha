import type { ComponentProps } from "react";
import { ChevronLeft, Search, X } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

export type MapsSearchBarProps = Omit<ComponentProps<"input">, "onSubmit"> & {
  /** `search` while browsing the map; `back` once a search or a place is open, which leaves it. */
  lead: "search" | "back";
  /** Presses the leading button. */
  onLead?: () => void;
  /** Sends what was typed. */
  onSubmit?: () => void;
  /** Clears what was typed; the clear button shows only while it is given. */
  onClear?: () => void;
};

/** The search field that floats over the top of the map. */
export function MapsSearchBar({ lead, onLead, onSubmit, onClear, className, ...props }: MapsSearchBarProps) {
  return (
    <form
      role="search"
      onSubmit={(event) => { event.preventDefault(); onSubmit?.(); }}
      className={cn("flex h-13 items-center rounded-full bg-background px-2 text-foreground shadow-md ring-1 ring-border", className)}
    >
      <button type="button" aria-label={lead === "search" ? "Search" : "Back"} onClick={onLead} className={cn(focusRing, "flex size-13 shrink-0 items-center justify-center rounded-full active:bg-accent [&_svg]:size-5.5")}>
        {lead === "search" ? <Search aria-hidden /> : <ChevronLeft aria-hidden />}
      </button>
      <input
        type="search"
        enterKeyHint="search"
        className="h-11 min-w-0 flex-1 bg-transparent px-1 text-body leading-tight outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none"
        {...props}
      />
      {onClear ? (
        <button type="button" aria-label="Clear search" onClick={onClear} className={cn(focusRing, "flex size-11 shrink-0 items-center justify-center rounded-full active:bg-accent")}>
          <X aria-hidden className="size-4.5" />
        </button>
      ) : null}
    </form>
  );
}
