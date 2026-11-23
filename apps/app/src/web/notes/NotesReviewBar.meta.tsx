import type { ComponentMeta } from "vibestack/stories";
import type { NotesReviewBarProps } from "./NotesReviewBar.tsx";

const noop = () => undefined;

export const meta: ComponentMeta<NotesReviewBarProps> = {
  args: { status: "Unconfirmed", dirty: true, canRetry: true, canCopy: true, onDiscard: noop, onRetry: noop, onCopy: noop },
  examples: {
    CouldNotOpen: { status: "Couldn’t open", dirty: false, canRetry: false, canCopy: false },
    KeptDraft: { status: "Kept draft", canRetry: false },
  },
};
