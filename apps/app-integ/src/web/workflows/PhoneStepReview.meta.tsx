import type { ComponentMeta } from "vibestack/stories";
import type { PhoneStepReviewProps } from "./PhoneStepReview.tsx";
import { stepAnchorMoved, stepApproveOnce, stepUnsynced, stepWaiting } from "./fixtures.ts";

export const meta: ComponentMeta<PhoneStepReviewProps> = {
  args: { steps: stepWaiting, canTap: true, onTap: () => undefined },
  examples: {
    ApproveOnce: { steps: stepApproveOnce },
    AnchorMoved: { steps: stepAnchorMoved, canTap: false },
    Unsynced: { steps: stepUnsynced, canTap: false },
  },
};
