// spec/clock/ringer.md, "Story: Hear an alarm once, from the page in front"; spec/clock/deletions.md, "Story: Undo a reviewed deletion in time"; spec/clock/notifications.md, "Story: Act on exactly the notification I see"; spec/clock/reminderTaps.md, "Story: Ask about a reminder I tapped"; spec/clock/workflowNotices.md, "Story: Return to the run a notice names"; spec/clock/notices.md, "Story: Be told my data was kept"
import { Effect } from "effect";
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
import { ClockRecovery } from "../../clock/recovery.vibe";
import { saveText } from "../../clock/page.ts";
import type { AppId } from "../app-screen.ts";
import { NoticesSurfaceView } from "./NoticesSurfaceView.tsx";
import { runtime } from "../runtime.ts";
import { act, buildInfo, now } from "../shell/services.ts";

const clock = (use: (a: ClockActions.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(ClockActions), use));
const deletions = (use: (d: Deletions.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(Deletions), use));
const shadeDo = (use: (n: Notifications.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(Notifications), use));

const recover = (use: (r: ClockRecovery.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(ClockRecovery), use));

/** What the shell gives the notices surface: how to open an app at a route. */
export type NoticesSurfaceProps = {
  /** Opens an app at a route, as the shell does for any surface. */
  readonly open: (app: AppId, route?: string) => void;
};

/**
 * Every notice Clock keeps over the screens: ringing alarms and timers, deletion Undo, notification questions, workflow
 * notice reports and retained data; a workflow notice's question opens in the assistant's question review. The browser build also offers its notification shade here.
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
  const kept = notices.state ?? noticesInitial;
  const download = () => {
    const bytes = now(Effect.flatMap(Effect.service(ClockRecovery), (r) => r.download()), undefined);
    if (bytes !== undefined && typeof kept.retained === "object" && kept.retained.tag === "Retained") saveText(`alpha-${kept.retained.heading.toLowerCase().replaceAll(" ", "-")}.json`, bytes);
  };
  const reminderQuestion = tap.stage === "TapQuestion" ? now(Effect.flatMap(Effect.service(ReminderTaps), (t) => t.question()), undefined) : undefined;
  return (
    <NoticesSurfaceView
      ringer={ringer}
      alarms={alarms}
      timers={timers}
      pending={pending}
      shade={shade}
      workflow={workflow}
      notices={kept}
      {...(reminderQuestion === undefined ? {} : { reminderQuestion })}
      browser={buildInfo().variant === "browser"}
      ringActions={{
        onSilence: () => clock((a) => a.silence()),
        onSnooze: (alarm) => clock((a) => Effect.andThen(a.silence(), a.snoozeAlarm(alarm.id, alarm.revision))),
        onDismiss: (alarm) => clock((a) => Effect.andThen(a.silence(), a.dismissAlarm(alarm.id, alarm.revision))),
        onStopTimer: (timer) => clock((a) => Effect.andThen(a.silence(), a.dismissTimer(timer.id, timer.revision))),
      }}
      deletionActions={{ onUndo: (key) => deletions((d) => d.undo(key)), onDismiss: (key) => deletions((d) => d.dismiss(key)), onRefresh: () => deletions((d) => d.refresh()) }}
      shadeActions={{
        onOpenChange: (open) => shadeDo((n) => (open ? n.open() : n.close())),
        onPress: (row: NoticeRow) => shadeDo((n) => n.press(row.id, row.revision)),
        onSwipe: (row: NoticeRow) => shadeDo((n) => n.swipe(row.id, row.revision)),
        onClearAll: () => shadeDo((n) => n.clearAll()),
        onSelect: (row: NoticeRow) => shadeDo((n) => n.select(row.id, row.revision)),
        onAsk: (row: NoticeRow) => shadeDo((n) => n.ask(row.id, row.revision)),
      }}
      onAnswerReminder={(draft) => act(Effect.flatMap(Effect.service(ReminderTaps), (t) => t.closeQuestion(draft)))}
      onAnswerShade={(draft) => shadeDo((n) => n.answer(draft))}
      retainedActions={{
        onClose: () => recover((r) => r.close()),
        onDownload: download,
        onAskReset: () => { void notices.send({ type: "askReset" }); },
        onCancelReset: () => { void notices.send({ type: "cancelReset" }); },
        onConfirmReset: () => recover((r) => r.reset()),
      }}
    />
  );
}
