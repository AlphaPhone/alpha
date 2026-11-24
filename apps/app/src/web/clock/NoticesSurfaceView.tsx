// spec/clock/ringer.md, "Story: Hear an alarm once, from the page in front"; spec/clock/deletions.md, "Story: Undo a reviewed deletion in time"; spec/clock/notifications.md, "Story: Act on exactly the notification I see"; spec/clock/reminderTaps.md, "Story: Ask about a reminder I tapped"; spec/clock/workflowNotices.md, "Story: Return to the run a notice names"; spec/clock/notices.md, "Story: Be told my data was kept"
import { Bell } from "lucide-react";
import type { Ringer } from "../../../gen/clock__ringer.ts";
import type { AlarmClock } from "../../../gen/clock__alarms.ts";
import type { Timers } from "../../../gen/clock__timers.ts";
import type { DeletionNotices } from "../../../gen/clock__deletions.ts";
import type { Shade } from "../../../gen/clock__notifications.ts";
import type { WorkflowNotices } from "../../../gen/clock__workflowNotices.ts";
import type { Notices } from "../../../gen/clock__notices.ts";
import type { ReminderQuestion } from "../../clock/reminder-taps.vibe";
import { Button } from "../components/ui/index.ts";
import { DeletionUndo, type DeletionUndoProps } from "./DeletionUndo.tsx";
import { NotificationShade, type NotificationShadeProps } from "./NotificationShade.tsx";
import { QuestionSheet } from "./QuestionSheet.tsx";
import { RetainedDataNotice, type RetainedDataNoticeProps } from "./RetainedDataNotice.tsx";
import { RingingCard, type RingingCardProps } from "./RingingCard.tsx";

const WORKFLOW_REPORT: Readonly<Record<string, string>> = { OtherAccount: "This notice belongs to another account.", RunUnavailable: "That run isn’t available.", NotKept: "Not kept", QuestionChanged: "This notification changed or is gone." };

/** The Clock machines' notices, the question a tapped reminder opened, the build, and every answer to them. */
export type NoticesSurfaceViewProps = {
  /** The page's ringer: whether it holds the lock and sounds. */
  ringer: Ringer;
  alarms: AlarmClock;
  timers: Timers;
  /** The owner's pending deletions. */
  pending: DeletionNotices;
  /** The browser build's notification shade. */
  shade: Shade;
  /** The workflow notice tap and its report. */
  workflow: WorkflowNotices;
  /** Retained data and the developer's reset. */
  notices: Notices;
  /** The reminder a question review is about, while one is open. */
  reminderQuestion?: Pick<ReminderQuestion, "title" | "text">;
  /** The browser build rings its own alarms and offers its notification shade. */
  browser: boolean;
  ringActions: Pick<RingingCardProps, "onSilence" | "onSnooze" | "onDismiss" | "onStopTimer">;
  deletionActions: Pick<DeletionUndoProps, "onUndo" | "onDismiss" | "onRefresh">;
  shadeActions: Pick<NotificationShadeProps, "onOpenChange" | "onPress" | "onSwipe" | "onClearAll" | "onSelect" | "onAsk">;
  /** Closes the reminder question with a draft, or none. */
  onAnswerReminder: (draft: string | undefined) => void;
  /** Closes the shade's question with a draft, or none. */
  onAnswerShade: (draft: string | undefined) => void;
  retainedActions: Pick<RetainedDataNoticeProps, "onClose" | "onDownload" | "onAskReset" | "onCancelReset" | "onConfirmReset">;
};

/**
 * Every notice Clock keeps over the screens: ringing alarms and timers, deletion Undo, notification questions, workflow notice reports, retained data and, in the browser build, the notification shade.
 * @model spec/clock/notices.md
 */
export function NoticesSurfaceView({
  ringer, alarms, timers, pending, shade, workflow, notices, reminderQuestion, browser,
  ringActions, deletionActions, shadeActions, onAnswerReminder, onAnswerShade, retainedActions,
}: NoticesSurfaceViewProps) {
  const retained = notices.retained;
  const shadeQuestion = typeof shade.question === "object" && shade.question.tag === "QuestionReview" ? shade.question : undefined;
  const shadeRow = shadeQuestion ? shade.rows.find((r) => r.id === shadeQuestion.id && r.revision === shadeQuestion.revision) : undefined;
  const workflowReport = WORKFLOW_REPORT[workflow.report] ?? "";
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-40 mx-auto flex max-w-md flex-col gap-2">
      <RingingCard ringer={ringer} alarms={browser ? alarms : { ...alarms, alarms: [] }} timers={timers} {...ringActions} />
      <DeletionUndo notices={pending} {...deletionActions} />
      {workflowReport && <p role="status" className="pointer-events-auto mx-3 rounded-lg bg-foreground px-4 py-3 text-sm text-background">{workflowReport}</p>}
      {browser && (
        <Button variant="ghost" size="icon" aria-label="Notifications" className="pointer-events-auto self-end" onClick={() => shadeActions.onOpenChange(true)}>
          <Bell aria-hidden className="size-5" />
        </Button>
      )}
      {browser && <NotificationShade shade={shade} {...shadeActions} />}
      {reminderQuestion && (
        <QuestionSheet name="Alpha Phone notification" excerpt={[reminderQuestion.title, reminderQuestion.text].filter(Boolean).join("\n")} onAnswer={onAnswerReminder} />
      )}
      {shadeRow && (
        <QuestionSheet name={`${shadeRow.appLabel || "Alpha Phone"} notification`} excerpt={[shadeRow.title, shadeRow.text].filter(Boolean).join("\n")} onAnswer={onAnswerShade} />
      )}
      {typeof retained === "object" && retained.tag === "Retained" && (
        <RetainedDataNotice heading={retained.heading} devTools={notices.mocks === true} recovery={notices.recovery} {...retainedActions} />
      )}
    </div>
  );
}
