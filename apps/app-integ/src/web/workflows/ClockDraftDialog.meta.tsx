import type { ComponentMeta } from "vibestack/stories";
import type { ClockDraftDialogProps } from "./ClockDraftDialog.tsx";

const none = () => undefined;

export const meta: ComponentMeta<ClockDraftDialogProps> = {
  args: { shown: true, review: false, canApprove: true, onPrepare: none, onApprove: none, onCancel: none },
  examples: {
    Weekdays: { start: { hour: 6, minute: 45, label: "Run", days: [2, 3, 4, 5, 6] } },
    Reviewing: { review: true, start: { hour: 7, minute: 30, label: "Wake", days: [] } },
    InTheBrowser: { review: true, canApprove: false },
  },
};
