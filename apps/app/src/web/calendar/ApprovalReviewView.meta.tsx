import type { ComponentMeta } from "vibestack/stories";
import type { ApprovalReviewViewProps } from "./ApprovalReviewView.tsx";
import { approvalAnswered, approvalChecking, approvalExpired, approvalIncomplete, approvalLong, approvalMissing, approvalPending, approvalRetryable } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<ApprovalReviewViewProps> = {
  args: { sheet: approvalPending, onClose: none, onChoose: none },
  examples: {
    Checking: { sheet: approvalChecking },
    Unverified: { sheet: approvalIncomplete },
    Retryable: { sheet: approvalRetryable },
    Expired: { sheet: approvalExpired },
    NotFound: { sheet: approvalMissing },
    Answered: { sheet: approvalAnswered },
    LongDetails: { sheet: approvalLong },
  },
};
