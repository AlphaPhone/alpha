import { type FormEvent, useCallback } from "react";
import { SearchField } from "../SearchField.tsx";

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
    <form role="search" aria-label="Search Gmail" onSubmit={submit} className="min-w-0 flex-1 pr-2">
      <SearchField ref={focus} aria-label="Search mail" placeholder="Search mail" autoComplete="off" value={value} onValueChange={onValueChange} clearLabel="Clear search" disabled={!onSearch} onKeyDown={(event) => {
        if (event.key === "Escape" && onClose) {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }} />
    </form>
  );
}
