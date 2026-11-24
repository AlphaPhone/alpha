import { Alert } from "../Alert.tsx";
import { Button } from "../Button.tsx";

export type InboxDraftClashProps = {
  /** Keeps the owner's text to be saved over the latest copy in Gmail. */
  onRestoreMine: () => void;
  /** Takes the latest saved draft, and the owner's edits give way to it. */
  onUseSaved?: () => void;
};

/**
 * The draft was changed in Gmail while it was being written: nothing is saved over either until the owner chooses
 * whose to keep.
 *
 * @model spec/app/inbox/drafts.md
 */
export function InboxDraftClash({ onRestoreMine, onUseSaved }: InboxDraftClashProps) {
  return (
    <Alert variant="warn">
      <div className="flex flex-col gap-3">
        <p>This draft changed in Gmail</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onRestoreMine}>Restore my edits</Button>
          {onUseSaved ? <Button variant="outline" size="sm" onClick={onUseSaved}>Use latest saved draft</Button> : null}
        </div>
      </div>
    </Alert>
  );
}
