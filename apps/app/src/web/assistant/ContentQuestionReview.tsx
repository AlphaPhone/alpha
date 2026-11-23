// spec/assistant/index.md, "Something handed to the assistant is only ever a draft the owner sends"
import { Effect } from "effect";
import { useState } from "react";
import type { AppId } from "../app-screen.ts";
import { AssistantDraft, excerptLimit, questionLimit, type QuestionReview } from "../../assistant/draft.vibe";
import { Button, Dialog, DialogContent, DialogTitle, Label, Textarea } from "../components/ui/index.ts";
import { reviewStream } from "./services.ts";
import { act, perform, useServiceStream } from "../shell/services.ts";

/** What the shell gives an overlay surface. */
export type ContentQuestionReviewProps = {
  /** Open an app, as the shell gives every surface; the review opens none. */
  readonly open: (app: AppId, route?: string) => void;
};

type FormProps = { readonly review: QuestionReview };

function ReviewForm({ review }: FormProps) {
  const [question, setQuestion] = useState(review.question);
  const [excerpt, setExcerpt] = useState(review.text);
  const [preview] = useState(() => (review.image === undefined ? undefined : URL.createObjectURL(review.image)));
  const release = () => { if (preview !== undefined) URL.revokeObjectURL(preview); };
  const dismiss = () => { release(); act(Effect.flatMap(Effect.service(AssistantDraft), (draft) => draft.dismiss(review.id))); };
  const ready = question.trim() !== "" && (excerpt.trim() !== "" || review.image !== undefined);
  const add = () => {
    void perform(Effect.flatMap(Effect.service(AssistantDraft), (draft) => draft.compose(review.id, question, excerpt)))
      .then((composed) => { if (composed) release(); }, () => undefined);
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) dismiss(); }}>
      <DialogContent aria-label="Ask about selected content" closeLabel="Cancel">
        <DialogTitle className="font-serif text-2xl">Ask Alpha</DialogTitle>
        <p role="note" aria-label="Selected source" className="break-words text-sm text-muted-foreground">{review.name}</p>
        {preview !== undefined && <img src={preview} alt="Image for question review" className="max-h-28 w-full rounded-lg object-contain" />}
        <Label className="flex flex-col gap-1">Question
          <Textarea aria-label="Question about content" rows={2} maxLength={questionLimit} value={question} onChange={(event) => setQuestion(event.target.value)} />
        </Label>
        <Label className="flex flex-col gap-1">{review.image === undefined ? "Content excerpt" : "Text or description"}
          <Textarea aria-label="Content excerpt" rows={review.image === undefined ? 5 : 2} maxLength={excerptLimit} value={excerpt}
            placeholder={review.image === undefined ? "Text to discuss" : "Describe or extract"} onChange={(event) => setExcerpt(event.target.value)} />
        </Label>
        {review.notice !== "" && <p role="status" className="text-sm text-warn">{review.notice}</p>}
        <footer className="flex justify-end gap-2">
          <Button variant="ghost" onClick={dismiss}>Cancel</Button>
          <Button aria-label="Use in conversation" disabled={!ready} onClick={add}>Add to chat</Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The review of a question another area handed to the assistant: the owner edits the question and excerpt, then adds them to the chat as a draft.
 * @model spec/assistant/index.md
 */
export function ContentQuestionReview(_props: ContentQuestionReviewProps) {
  const review = useServiceStream("assistant/question-review", reviewStream, undefined);
  return review === undefined ? null : <ReviewForm key={review.id} review={review} />;
}
