// spec/assistant/index.md, "Something handed to the assistant is only ever a draft the owner sends"; spec/assistant/attachments.md, "A file's question is reviewed before it joins the draft: \"Use excerpt\" for its text, its name alone for a file too large, and its source line only while linked"
import { useState } from "react";
import { excerptLimit, questionLimit, type QuestionReview } from "../../assistant/draft.vibe";
import { Button, Dialog, DialogContent, DialogTitle, Label, Switch, Textarea } from "../components/ui/index.ts";

/** The question review open now and the owner's answers to it. */
export type ContentQuestionReviewViewProps = {
  /** The review another area handed over: its source, question, excerpt and notice. */
  review: QuestionReview;
  /** The owner left the review; nothing joins the draft. */
  onDismiss: () => void;
  /** The owner chose Add to chat; resolves true once the question joined the draft. */
  onAdd: (question: string, excerpt: string, linked: boolean) => Promise<boolean>;
};

/**
 * The review of a question another area handed to the assistant: the owner edits the question and excerpt, then adds them to the chat as a draft.
 */
export function ContentQuestionReviewView({ review, onDismiss, onAdd }: ContentQuestionReviewViewProps) {
  const [question, setQuestion] = useState(review.question);
  const [excerpt, setExcerpt] = useState(review.text);
  const [linked, setLinked] = useState(true);
  const sourceOnly = review.file === "SourceAsk";
  const [preview] = useState(() => (review.image === undefined ? undefined : URL.createObjectURL(review.image)));
  const release = () => { if (preview !== undefined) URL.revokeObjectURL(preview); };
  const dismiss = () => { release(); onDismiss(); };
  const ready = question.trim() !== "" && (excerpt.trim() !== "" || review.image !== undefined || sourceOnly);
  const add = () => {
    void onAdd(question, excerpt, linked).then((composed) => { if (composed) release(); }, () => undefined);
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) dismiss(); }}>
      <DialogContent aria-label="Ask about selected content" closeLabel="Cancel">
        <DialogTitle className="font-display text-2xl">{review.label}</DialogTitle>
        <p role="note" aria-label="Selected source" className="break-words text-sm text-muted-foreground">{review.name}</p>
        {preview !== undefined && <img src={preview} alt="Image for question review" className="max-h-28 w-full rounded-lg object-contain" />}
        <Label className="flex flex-col gap-1">Question
          <Textarea aria-label="Question about content" rows={2} maxLength={questionLimit} value={question} onChange={(event) => setQuestion(event.target.value)} />
        </Label>
        {!sourceOnly && (
          <Label className="flex flex-col gap-1">{review.image === undefined ? "Content excerpt" : "Text or description"}
            <Textarea aria-label="Content excerpt" rows={review.image === undefined ? 5 : 2} maxLength={excerptLimit} value={excerpt}
              placeholder={review.image === undefined ? "Text to discuss" : "Describe or extract"} onChange={(event) => setExcerpt(event.target.value)} />
          </Label>
        )}
        {review.file !== undefined && (
          <Label className="flex items-center justify-between gap-2 text-sm">Link source
            <Switch aria-label="Link source" checked={linked} onCheckedChange={setLinked} />
          </Label>
        )}
        {review.notice !== "" && <p role="status" className="text-sm text-warn">{review.notice}</p>}
        <footer className="flex justify-end gap-2">
          <Button variant="ghost" onClick={dismiss}>Cancel</Button>
          <Button aria-label="Use in conversation" disabled={!ready} onClick={add}>Add to chat</Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
