// spec/maps/screen.md, "Typing waits 350 milliseconds; Enter searches once for the text, and repeating it reuses the answer"; spec/maps/screen.md, "Back closes one layer at a time"
import { ArrowLeft, Search, X } from "lucide-react";
import { Button, Input } from "../components/ui/index.ts";

/** The search field's text and which of Back, Search and Clear it offers. */
export type SearchBarProps = {
  /** The text in the field, as the screen machine holds it. */
  query: string;
  /** Back closes a layer; otherwise the lead button starts a search. */
  canBack: boolean;
  /** Whether the field may be cleared. */
  canClear: boolean;
  onType: (text: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  onLead: () => void;
};

/** The search field over the map: lead Back or Search, the query, and Clear. */
export function SearchBar({ query, canBack, canClear, onType, onSubmit, onClear, onLead }: SearchBarProps) {
  return (
    <form role="search" className="flex items-center gap-1 rounded-xl bg-card p-1 shadow-md" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <Button variant="ghost" size="icon" aria-label={canBack ? "Back" : "Search"} onClick={onLead}>
        {canBack ? <ArrowLeft aria-hidden /> : <Search aria-hidden />}
      </Button>
      <Input aria-label="Search places" value={query} maxLength={300} enterKeyHint="search" autoComplete="off"
        className="flex-1 border-0 bg-transparent" placeholder="Search Maps" onChange={(e) => onType(e.target.value)} />
      {canClear && query !== "" && (
        <Button variant="ghost" size="icon" aria-label="Clear search" onClick={onClear}><X aria-hidden /></Button>
      )}
    </form>
  );
}
