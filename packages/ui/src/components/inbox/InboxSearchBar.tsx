import { type FormEvent, useCallback } from "react";
import { Search, X } from "lucide-react";
import { Button } from "../Button.tsx";

export type InboxSearchBarProps = {
  /** What is typed; the parent keeps it. */
  value: string;
  /** Called with the text as it is typed. */
  onValueChange: (value: string) => void;
  /** Called with the text when it is submitted; the search is offered only where mail can be read and this folder can be searched. Left out, the field refuses. */
  onSearch?: (query: string) => void;
  /** Moves focus into the field as the owner opens the search. */
  focusOnOpen?: boolean;
  /** Closes the search when the owner presses Escape. */
  onClose?: () => void;
};

/**
 * The search of the folder shown: a field that reads the first page of the matches when it is submitted.
 *
 * @model spec/app/inbox/index.md
 */
export function InboxSearchBar({ value, onValueChange, onSearch, focusOnOpen = false, onClose }: InboxSearchBarProps) {
  const focus = useCallback((field: HTMLInputElement | null) => { if (focusOnOpen) field?.focus(); }, [focusOnOpen]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSearch?.(value.trim());
  };
  return (
    <form role="search" aria-label="Search Gmail" onSubmit={submit} className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-panel bg-secondary pr-1 pl-4 text-secondary-foreground">
      <Search aria-hidden className="size-4.5 shrink-0 text-muted-foreground" />
      <input ref={focus} type="search" enterKeyHint="search" aria-label="Search mail" placeholder="Search mail" autoComplete="off" value={value} disabled={!onSearch}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && onClose) {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
        }}
        className="h-11 min-w-0 flex-1 border-0 bg-transparent p-0 text-md text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none" />
      <Button type="button" variant="ghost" size="icon" aria-label="Clear search" disabled={!onSearch} className="size-10 min-w-10 [&_svg:not([class*='size-'])]:size-4.5"
        onClick={(event) => {
          onValueChange("");
          event.currentTarget.parentElement?.querySelector("input")?.focus();
        }}><X /></Button>
    </form>
  );
}
