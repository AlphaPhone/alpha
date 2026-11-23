// spec/notes/collection.md, "The status line says what is wrong in one word"; spec/notes/editor.md, "Try again confirms words already saved, rebases only onto an untouched record, and otherwise keeps the draft"; spec/notes/editor.md, "Copy draft copies the draft on screen only while it is the same reviewed draft"; spec/notes/editor.md, "A kept draft is offered back only for the same owner over the record it started from, and cleared only by its exact value"
import { Alert, Button } from "../components/ui/index.ts";

export type NotesReviewBarProps = {
  /** The one-word status: Unsaved, Couldn't open or Unconfirmed. */
  status: string;
  /** Whether the open draft holds edits, which Discard throws away; otherwise the action reloads Notes. */
  dirty: boolean;
  /** Whether Try again and Copy draft are offered; Try again only where there is a save to try again. */
  canRetry: boolean;
  canCopy: boolean;
  onDiscard: () => void;
  onRetry?: () => void;
  onCopy: () => void;
};

/** What to do about a change Notes could not confirm: try again, copy the draft, or discard it and read Notes again. */
export function NotesReviewBar({ status, dirty, canRetry, canCopy, onDiscard, onRetry, onCopy }: NotesReviewBarProps) {
  return (
    <Alert variant="warn" className="mx-4 flex flex-wrap items-center gap-2" role="status">
      <span className="flex-1 font-mono text-xs uppercase">{status}</span>
      {canRetry && onRetry !== undefined && <Button size="sm" variant="secondary" onClick={onRetry}>Try again</Button>}
      {canCopy && <Button size="sm" variant="secondary" onClick={onCopy}>Copy draft</Button>}
      <Button size="sm" variant="ghost" onClick={onDiscard}>{dirty ? "Discard" : "Reload Notes"}</Button>
    </Alert>
  );
}
