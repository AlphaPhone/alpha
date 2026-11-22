// spec/assistant/suggestion.md, "Story: Use a suggested wording exactly as I reviewed it"
import type { SuggestionView } from "../../assistant/suggestion.vibe";
import { Button, Card, CardFooter } from "../components/ui/index.ts";

export type SuggestionReviewProps = {
  /** The review open now, or none. */
  view?: SuggestionView;
  /** Insert exactly the wording shown. */
  onInsert: () => void;
  onClose: () => void;
};

/**
 * The review of a suggested wording: the exact text Insert will place, once.
 * @model spec/assistant/suggestion.md
 */
export function SuggestionReview({ view, onInsert, onClose }: SuggestionReviewProps) {
  if (view === undefined) return null;
  return (
    <Card className="gap-2 p-4" aria-label="Suggested wording">
      <p className="font-legible whitespace-pre-wrap">{view.text}</p>
      {view.notice !== "" && <p role="status" className="text-sm text-warn">{view.notice}</p>}
      <CardFooter className="gap-2">
        <Button onClick={onInsert}>Insert</Button>
        <Button variant="outline" onClick={onClose}>Not now</Button>
      </CardFooter>
    </Card>
  );
}
