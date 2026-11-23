import type { ComponentMeta } from "vibestack/stories";
import type { PromptSheetProps } from "./PromptSheet.tsx";
import { editingPrompt } from "./fixtures.ts";

export const meta: ComponentMeta<PromptSheetProps> = {
  args: { open: true, canSave: true, onOpenChange: () => undefined, onSave: () => undefined },
  examples: {
    Changing: { editing: editingPrompt },
    NotConfirmed: { editing: editingPrompt, report: { answer: "unknown", word: "not-confirmed" } },
    Held: { canSave: false },
  },
};
