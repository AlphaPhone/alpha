import type { ComponentMeta } from "vibestack/stories";
import { initial as noAlarms } from "../../../gen/clock__alarms.ts";
import { initial as noTimers } from "../../../gen/clock__timers.ts";
import { initial as pending } from "../../../gen/clock__deletions.ts";
import { initial as closedShade } from "../../../gen/clock__notifications.ts";
import { initial as workflow } from "../../../gen/clock__workflowNotices.ts";
import { initial as notices } from "../../../gen/clock__notices.ts";
import type { NoticesSurfaceViewProps } from "./NoticesSurfaceView.tsx";
import {
  alarms, pendingDeletions, reminderQuestion, retainedNotices, retainedReset, ringer, shade, shadeQuestion, sounding, timers, workflowUnavailable,
} from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<NoticesSurfaceViewProps> = {
  args: {
    ringer, alarms: noAlarms, timers: noTimers, pending, shade: closedShade, workflow, notices, browser: true, onAnswerReminder: none, onAnswerShade: none,
    ringActions: { onSilence: none, onSnooze: none, onDismiss: none, onStopTimer: none },
    deletionActions: { onUndo: none, onDismiss: none, onRefresh: none },
    shadeActions: { onOpenChange: none, onPress: none, onSwipe: none, onClearAll: none, onSelect: none, onAsk: none },
    retainedActions: { onClose: none, onDownload: none, onAskReset: none, onCancelReset: none, onConfirmReset: none },
  },
  examples: {
    Ringing: { ringer: sounding, alarms, timers },
    RingingOnPhone: { ringer: sounding, alarms, timers, browser: false },
    DeletionUndo: { pending: pendingDeletions },
    ShadeOpen: { shade },
    ShadeQuestion: { shade: shadeQuestion },
    ReminderQuestion: { reminderQuestion },
    WorkflowReport: { workflow: workflowUnavailable },
    RetainedData: { notices: retainedNotices },
    DeveloperReset: { notices: retainedReset },
    Phone: { browser: false },
  },
};
