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
    FailedWithSteps: {
      details: {
        events: [
          { type: "RunStarted", at: "2026-11-22T07:00:00.000Z", node: "" },
          { type: "NodeFailed", at: "2026-11-22T07:00:02.000Z", node: "read" },
          { type: "RunFailed", at: "2026-11-22T07:00:02.000Z", node: "" },
        ],
        reason: "StoppedWithError",
      },
    },
    OutcomeUnknown: { runs: unknownRun, can: { ...can, review: false, reconcile: true }, outcome: "unknown" },
  },
};
