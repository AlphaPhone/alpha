// spec/clock/ringer.md, "Story: Hear an alarm once, from the page in front"; spec/clock/deletions.md, "Story: Undo a reviewed deletion in time"; spec/clock/notifications.md, "Story: Act on exactly the notification I see"; spec/clock/reminderTaps.md, "Story: Ask about a reminder I tapped"; spec/clock/workflowNotices.md, "Story: Return to the run a notice names"; spec/clock/notices.md, "Story: Be told my data was kept"
import { Effect } from "effect";
import { Bell } from "lucide-react";
import { useMachine as useRinger } from "../../../gen/clock__ringer.react.ts";
import { useMachine as useAlarms } from "../../../gen/clock__alarms.react.ts";
import { useMachine as useTimers } from "../../../gen/clock__timers.react.ts";
import { useMachine as useDeletions } from "../../../gen/clock__deletions.react.ts";
import { useMachine as useShade } from "../../../gen/clock__notifications.react.ts";
import { useMachine as useTaps } from "../../../gen/clock__reminderTaps.react.ts";
import { useMachine as useWorkflow } from "../../../gen/clock__workflowNotices.react.ts";
import { useMachine as useNotices } from "../../../gen/clock__notices.react.ts";
import { initial as ringerInitial } from "../../../gen/clock__ringer.ts";
import { initial as alarmsInitial } from "../../../gen/clock__alarms.ts";
import { initial as timersInitial } from "../../../gen/clock__timers.ts";
import { initial as deletionsInitial } from "../../../gen/clock__deletions.ts";
import { initial as shadeInitial, type NoticeRow } from "../../../gen/clock__notifications.ts";
import { initial as tapsInitial } from "../../../gen/clock__reminderTaps.ts";
import { initial as workflowInitial } from "../../../gen/clock__workflowNotices.ts";
import { initial as noticesInitial } from "../../../gen/clock__notices.ts";
import { ClockActions } from "../../clock/clock.vibe";
import { Deletions } from "../../clock/deletions.vibe";
import { Notifications } from "../../clock/notifications.vibe";
import { ReminderTaps } from "../../clock/reminder-taps.vibe";
import { WorkflowNotices } from "../../clock/workflow-notices.vibe";
import { ClockRecovery } from "../../clock/recovery.vibe";
import { saveText } from "../../clock/page.ts";
import type { AppId } from "../app-screen.ts";
import { Button } from "../components/ui/index.ts";
import { DeletionUndo } from "./DeletionUndo.tsx";
import { NotificationShade } from "./NotificationShade.tsx";
import { QuestionSheet } from "./QuestionSheet.tsx";
import { RetainedDataNotice } from "./RetainedDataNotice.tsx";
import { RingingCard } from "./RingingCard.tsx";
import { buildInfo, run, runtime } from "./connect.ts";

const clock = (act: (a: ClockActions.Shape) => Effect.Effect<unknown>) => run(Effect.flatMap(Effect.service(ClockActions), act));
const deletions = (act: (d: Deletions.Shape) => Effect.Effect<unknown>) => run(Effect.flatMap(Effect.service(Deletions), act));
const shadeDo = (act: (n: Notifications.Shape) => Effect.Effect<unknown>) => run(Effect.flatMap(Effect.service(Notifications), act));

const recover = (act: (r: ClockRecovery.Shape) => Effect.Effect<unknown>) => run(Effect.flatMap(Effect.service(ClockRecovery), act));

/** What the shell gives the notices surface: how to open an app at a route. */
export type NoticesSurfaceProps = {
  /** Opens an app at a route, as the shell does for any surface. */
  readonly open: (app: AppId, route?: string) => void;
};

const WORKFLOW_REPORT: Readonly<Record<string, string>> = { OtherAccount: "This notice belongs to another account.", RunUnavailable: "That run isn’t available.", NotKept: "Not kept" };

/**
 * Every notice Clock keeps over the screens: ringing alarms and timers, deletion Undo, notification questions, workflow
 * notices and retained data. The browser build also offers its notification shade here.
 * @model spec/clock/notices.md
 */
export function NoticesSurface(_props: NoticesSurfaceProps) {
  const { state: ringer = ringerInitial } = useRinger(runtime);
  const { state: alarms = alarmsInitial } = useAlarms(runtime);
  const { state: timers = timersInitial } = useTimers(runtime);
  const { state: pending = deletionsInitial } = useDeletions(runtime);
  const { state: shade = shadeInitial } = useShade(runtime);
  const { state: tap = tapsInitial } = useTaps(runtime);
  const { state: workflow = workflowInitial } = useWorkflow(runtime);
  const notices = useNotices(runtime);
  const retained = notices.state?.retained ?? noticesInitial.retained;
  const recovery = notices.state?.recovery ?? noticesInitial.recovery;
  const download = () => {
    const kept = runtime.runSync(Effect.flatMap(Effect.service(ClockRecovery), (r) => r.download()));
    if (kept !== undefined && typeof retained === "object" && retained.tag === "Retained") saveText(`alpha-${retained.heading.toLowerCase().replaceAll(" ", "-")}.json`, kept);
  };
  const reminderQuestion = tap.stage === "TapQuestion" ? runtime.runSync(Effect.flatMap(Effect.service(ReminderTaps), (t) => t.question())) : undefined;
  const workflowQuestion = workflow.stage === "WQuestionTap" ? runtime.runSync(Effect.flatMap(Effect.service(WorkflowNotices), (w) => w.question())) : undefined;
  const shadeQuestion = typeof shade.question === "object" && shade.question.tag === "QuestionReview" ? shade.question : undefined;
  const shadeRow = shadeQuestion ? shade.rows.find((r) => r.id === shadeQuestion.id && r.revision === shadeQuestion.revision) : undefined;
  const browser = buildInfo().variant === "browser";
  const workflowReport = WORKFLOW_REPORT[workflow.report] ?? "";
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-40 mx-auto flex max-w-md flex-col gap-2">
      <RingingCard
        ringer={ringer}
        alarms={browser ? alarms : { ...alarms, alarms: [] }}
        timers={timers}
        onSilence={() => clock((a) => a.silence())}
        onSnooze={(alarm) => clock((a) => Effect.andThen(a.silence(), a.snoozeAlarm(alarm.id, alarm.revision)))}
        onDismiss={(alarm) => clock((a) => Effect.andThen(a.silence(), a.dismissAlarm(alarm.id, alarm.revision)))}
        onStopTimer={(timer) => clock((a) => Effect.andThen(a.silence(), a.dismissTimer(timer.id, timer.revision)))}
      />
      <DeletionUndo notices={pending} onUndo={(key) => deletions((d) => d.undo(key))} onDismiss={(key) => deletions((d) => d.dismiss(key))} onRefresh={() => deletions((d) => d.refresh())} />
      {workflowReport && <p role="status" className="pointer-events-auto mx-3 rounded-lg bg-foreground px-4 py-3 text-sm text-background">{workflowReport}</p>}
      {browser && (
        <Button variant="ghost" size="icon" aria-label="Notifications" className="pointer-events-auto self-end" onClick={() => shadeDo((n) => n.open())}>
          <Bell aria-hidden className="size-5" />
        </Button>
      )}
      {browser && (
        <NotificationShade
          shade={shade}
          onOpenChange={(open) => shadeDo((n) => (open ? n.open() : n.close()))}
          onPress={(row: NoticeRow) => shadeDo((n) => n.press(row.id, row.revision))}
          onSwipe={(row: NoticeRow) => shadeDo((n) => n.swipe(row.id, row.revision))}
          onClearAll={() => shadeDo((n) => n.clearAll())}
          onSelect={(row: NoticeRow) => shadeDo((n) => n.select(row.id, row.revision))}
          onAsk={(row: NoticeRow) => shadeDo((n) => n.ask(row.id, row.revision))}
        />
      )}
      {reminderQuestion && (
        <QuestionSheet name="Alpha Phone notification" excerpt={[reminderQuestion.title, reminderQuestion.text].filter(Boolean).join("\n")}
          onAnswer={(draft) => run(Effect.flatMap(Effect.service(ReminderTaps), (t) => t.closeQuestion(draft)))} />
      )}
      {workflowQuestion && (
        <QuestionSheet name="Workflows notification" excerpt={[workflowQuestion.title, workflowQuestion.text].filter(Boolean).join("\n")}
          onAnswer={(draft) => run(Effect.flatMap(Effect.service(WorkflowNotices), (w) => w.answer(draft)))} />
      )}
      {shadeRow && (
        <QuestionSheet name={`${shadeRow.appLabel || "Alpha Phone"} notification`} excerpt={[shadeRow.title, shadeRow.text].filter(Boolean).join("\n")}
          onAnswer={(draft) => shadeDo((n) => n.answer(draft))} />
      )}
      {typeof retained === "object" && retained.tag === "Retained" && (
        <RetainedDataNotice
          heading={retained.heading}
          devTools={notices.state?.mocks === true}
          recovery={recovery}
          onClose={() => recover((r) => r.close())}
          onDownload={download}
          onAskReset={() => { void notices.send({ type: "askReset" }); }}
          onCancelReset={() => { void notices.send({ type: "cancelReset" }); }}
          onConfirmReset={() => recover((r) => r.reset())}
        />
      )}
    </div>
  );
}
