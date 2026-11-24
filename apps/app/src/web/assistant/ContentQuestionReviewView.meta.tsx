import { expect, fn, screen, userEvent } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { ContentQuestionReviewViewProps } from "./ContentQuestionReviewView.tsx";
import { blankReview, fileExcerptReview, imageReview, passageReview, sourceOnlyReview, truncatedReview } from "./fixtures.ts";

export const meta: ComponentMeta<ContentQuestionReviewViewProps> = {
  args: { review: passageReview, onDismiss: fn(), onAdd: fn(() => Promise.resolve(true)) },
  examples: {
    FileExcerpt: { review: fileExcerptReview },
    SourceOnly: { review: sourceOnlyReview },
    Image: { review: imageReview },
    Truncated: { review: truncatedReview },
    Refused: { review: blankReview, onAdd: fn(() => Promise.resolve(false)) },
  },
  play: {
    Default: async ({ args }: { args: ContentQuestionReviewViewProps }) => {
      await userEvent.click(screen.getByRole("button", { name: "Use in conversation" }));
      await expect(args.onAdd).toHaveBeenCalledWith(passageReview.question, passageReview.text, true);
    },
    FileExcerpt: async ({ args }: { args: ContentQuestionReviewViewProps }) => {
      await userEvent.click(screen.getByRole("switch", { name: "Link source" }));
      await userEvent.click(screen.getByRole("button", { name: "Use in conversation" }));
      await expect(args.onAdd).toHaveBeenCalledWith(fileExcerptReview.question, fileExcerptReview.text, false);
    },
    SourceOnly: () => expect(screen.queryByRole("textbox", { name: "Content excerpt" })).toBeNull(),
    Refused: () => expect(screen.getByRole("button", { name: "Use in conversation" })).toBeDisabled(),
  },
};
