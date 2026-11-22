// spec/browser/reading.md, "The question goes to the editor only with an excerpt or clean pasted text, and only while the same page is shown"; spec/browser/reading.md, "Read is offered only after the page text settled, speaks a non-empty clean excerpt of the still-current page, and only the latest speech ends the reading"
import { type Reading, canLocalRead, canQuestionApproved } from "../../../gen/browser__reading.ts";
import { MAX_EXCERPT } from "../../browser/page-text.ts";
import { Button, Dialog, DialogContent, DialogTitle, Textarea } from "../components/ui/index.ts";

export interface ReadingReviewProps {
  reading: Reading;
  /** The owner edits the excerpt. */
  onEdit: (text: string) => void;
  /** Continue to the question, or Read locally. */
  onApprove: () => void;
  /** Stop the local reading. */
  onStop: () => void;
  onClose: () => void;
}

/**
 * The excerpt the owner reviews before it is asked about or read aloud on the browser build; nothing here is saved.
 * @model spec/browser/reading.md
 */
export function ReadingReview({ reading, onEdit, onApprove, onStop, onClose }: ReadingReviewProps) {
  const asking = reading.kind === "AskAboutPage";
  const open = reading.phase === "Reviewing" || (reading.kind === "ReadLocally" && reading.phase === "Speaking");
  if (!open || reading.kind === "ReadAloud") return null;
  const speaking = reading.phase === "Speaking";
  const ready = asking ? canQuestionApproved(reading, reading.bound) : canLocalRead(reading, true);
  const origin = URL.parse(reading.bound.url)?.origin ?? "";
  const status = reading.blocked ? "Contains secrets" : reading.excerpt === "SensitiveText" ? "This text may contain credentials or codes." : reading.sourcePending ? "Reading the page…" : reading.excerpt === "NoExcerpt" ? "Paste text" : "";
  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>{asking ? "Ask about page" : "Read page excerpt"}</DialogTitle>
        <p className="break-all font-mono text-xs uppercase text-muted-foreground">{origin} · on device · not saved</p>
        <Textarea aria-label="Excerpt" rows={7} maxLength={MAX_EXCERPT} value={reading.text} disabled={reading.blocked || speaking} onChange={(event) => onEdit(event.target.value)} />
        <div className="flex justify-between font-mono text-xs tabular-nums text-muted-foreground">
          <span role="status">{status}</span>
          <span aria-label="Characters">{reading.text.length.toLocaleString()}/{MAX_EXCERPT.toLocaleString()}</span>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {!asking && <Button variant="secondary" disabled={!speaking} onClick={onStop}>Stop reading</Button>}
          <Button disabled={!ready} onClick={onApprove}>{asking ? "Continue" : "Read locally"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
