import type { ComponentMeta } from "vibestack/stories";
import type { ReviewSheetProps } from "./ReviewSheet.tsx";
import { sendReview, unknownArchive } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<ReviewSheetProps> = {
  args: {
    record: sendReview, open: true, confirmable: true, busy: false, onConfirm: none, onRefresh: none, onRetry: none, onClear: none,
    onAbandon: none, onUndo: none, onContinueDraft: none, onDeleteDraft: none, onClose: none,
  },
  examples: { OutcomeUnknown: { record: unknownArchive }, EmailNotShown: { confirmable: false } },
};
