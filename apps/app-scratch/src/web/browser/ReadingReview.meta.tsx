import type { ComponentMeta } from "vibestack/stories";
import type { ReadingReviewProps } from "./ReadingReview.tsx";
import { questionReading } from "./fixtures.ts";

export const meta: ComponentMeta<ReadingReviewProps> = {
  args: { reading: questionReading },
  examples: {
    EmptyExcerpt: { reading: { ...questionReading, excerpt: "NoExcerpt", text: "" } },
    LocalReading: { reading: { ...questionReading, kind: "ReadLocally" } },
    Blocked: { reading: { ...questionReading, kind: "ReadLocally", blocked: true, excerpt: "NoExcerpt", text: "" } },
  },
};
