import type { ComponentMeta } from "vibestack/stories";
import type { DigestPanelProps } from "./DigestPanel.tsx";
import { digestPanel, finishedResult, runNowOffer } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<DigestPanelProps> = {
  args: {
    digests: digestPanel, deviceZone: "Europe/Paris", can: { retry: false, discard: false, change: true },
    onToggle: none, onReviewRunNow: none, onRunNow: none, onCloseRunNow: none, onRetry: none, onDiscard: none, onOpenResult: none,
  },
  examples: {
    KeptChange: { digests: { ...digestPanel, loaded: true, pending: "InReview", notice: "ChangeUnconfirmed" }, can: { retry: true, discard: true, change: false } },
    OtherZone: { deviceZone: "America/New_York" },
    RunNowReview: { runNowReview: runNowOffer },
    OpenedResult: { digests: { ...digestPanel, results: [finishedResult, ...digestPanel.results] }, opened: finishedResult.runId },
  },
};
