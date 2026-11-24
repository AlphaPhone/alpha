import { fn } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { ContentQuestionReviewProps } from "./ContentQuestionReview.tsx";

export const meta: ComponentMeta<ContentQuestionReviewProps> = {
  args: { open: fn() },
};
