import type { ComponentMeta } from "vibestack/stories";
import type { RetainedDataNoticeProps } from "./RetainedDataNotice.tsx";

const none = () => undefined;

export const meta: ComponentMeta<RetainedDataNoticeProps> = {
  args: { heading: "Reminders", devTools: false, recovery: "NoRecovery", onClose: none, onDownload: none, onAskReset: none, onCancelReset: none, onConfirmReset: none },
  examples: {
    Developer: { devTools: true },
    ConfirmingReset: { devTools: true, recovery: "ConfirmingReset" },
    Resetting: { devTools: true, recovery: "Resetting" },
    ResetDone: { devTools: true, recovery: "ResetDone" },
  },
};
