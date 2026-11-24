// spec/assistant/index.md, "Something handed to the assistant is only ever a draft the owner sends"; spec/assistant/attachments.md, "A file's question is reviewed before it joins the draft: \"Use excerpt\" for its text, its name alone for a file too large, and its source line only while linked"
import { Effect } from "effect";
import type { AppId } from "../app-screen.ts";
import { AssistantDraft } from "../../assistant/draft.vibe";
import { ContentQuestionReviewView } from "./ContentQuestionReviewView.tsx";
import { reviewStream } from "./services.ts";
import { act, perform, useServiceStream } from "../shell/services.ts";

/** What the shell gives an overlay surface. */
export type ContentQuestionReviewProps = {
  /** Open an app, as the shell gives every surface; the review opens none. */
  readonly open: (app: AppId, route?: string) => void;
};

/**
 * The review of a question another area handed to the assistant, read from the runtime: the owner edits the question and excerpt, then adds them to the chat as a draft.
 */
export function ContentQuestionReview(_props: ContentQuestionReviewProps) {
  const review = useServiceStream("assistant/question-review", reviewStream, undefined);
  if (review === undefined) return null;
  return (
    <ContentQuestionReviewView
      key={review.id}
      review={review}
      onDismiss={() => act(Effect.flatMap(Effect.service(AssistantDraft), (draft) => draft.dismiss(review.id)))}
      onAdd={(question, excerpt, linked) => perform(Effect.flatMap(Effect.service(AssistantDraft), (draft) => draft.compose(review.id, question, excerpt, linked)))}
    />
  );
}
