import type { ComponentMeta } from "vibestack/stories";
import { reviewBody, reviewChange, reviewMore } from "./fixtures.ts";
import type { ReviewRowsProps } from "./ReviewRows.tsx";

export const meta: ComponentMeta<ReviewRowsProps> = {
  args: { details: reviewBody },
  examples: {
    MoreMatches: { details: reviewMore },
    ContactChange: { details: reviewChange },
    LongBody: { details: { body: "Running late, start without me. ".repeat(12).trim() } },
    FromRuntime: { details: undefined },
  },
};
