import type { FormEvent } from "react";
import { SearchField } from "../SearchField.tsx";

export type InboxSearchBarProps = {
  /** What is typed; the parent keeps it. */
  value: string;
  /** Called with the text as it is typed. */
  onValueChange: (value: string) => void;
  /** Called with the text when it is submitted; the search is offered only where mail can be read and this folder can be searched. Left out, the field refuses. */
  onSearch?: (query: string) => void;
};

/**
 * The search of the folder shown: a field that reads the first page of the matches when it is submitted.
 *
 * @model spec/app/inbox/index.md
 */
export function InboxSearchBar({ value, onValueChange, onSearch }: InboxSearchBarProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSearch?.(value.trim());
  };
  return (
    <form role="search" aria-label="Search Gmail" onSubmit={submit}>
      <SearchField aria-label="Search mail" placeholder="Search mail" value={value} onValueChange={onValueChange} clearLabel="Clear search" disabled={!onSearch} />
    </form>
  );
}
