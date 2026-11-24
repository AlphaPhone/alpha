import type { ComponentMeta } from "vibestack/stories";
import type { RunPanelProps } from "./RunPanel.tsx";
import { unknownRun, withHistory } from "./fixtures.ts";

const can = { review: true, confirm: false, reviewResend: false, resend: false, cancel: false, reconcile: false };
const none = () => undefined;

export const meta: ComponentMeta<RunPanelProps> = {
  args: { runs: withHistory, can, onReview: none, onConfirm: none, onReconcile: none, onReviewResend: none, onResend: none, onCancel: none, onSelect: none, onRunMissedNow: none },
  examples: {
    MissedSelected: { runs: { ...withHistory, selected: "r1" } },
    WithOutput: { output: "Three meetings today; dentist at 4." },
    OutcomeUnknown: { runs: unknownRun, can: { ...can, review: false, reconcile: true }, outcome: "unknown" },
  },
};
