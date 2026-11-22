// spec/clock/reminders.md, "Story: See my reminders as the phone holds them"; spec/clock/reminders.md, "Story: Change a reminder exactly once"; spec/clock/reminderTaps.md, "Story: Open the reminder I tapped"
import { useState } from "react";
import { Effect } from "effect";
import { useMachine as useReminders } from "../../../gen/clock__reminders.react.ts";
import { useMachine as useJournal } from "../../../gen/clock__reminderJournal.react.ts";
import { useMachine as useTaps } from "../../../gen/clock__reminderTaps.react.ts";
import { useMachine as useRinger } from "../../../gen/clock__ringer.react.ts";
import { initial as remindersInitial } from "../../../gen/clock__reminders.ts";
import { initial as journalInitial, pendingCreations, unconfirmedChanges } from "../../../gen/clock__reminderJournal.ts";
import { initial as tapsInitial } from "../../../gen/clock__reminderTaps.ts";
import { initial as ringerInitial } from "../../../gen/clock__ringer.ts";
import { Reminders } from "../../clock/reminders.vibe";
import { ReminderTaps } from "../../clock/reminder-taps.vibe";
import type { ScreenProps } from "../app-screen.ts";
import { RemindersView } from "./RemindersView.tsx";
import { run, runtime } from "./connect.ts";

const remind = (use: (r: Reminders.Shape) => Effect.Effect<unknown>) => run(Effect.flatMap(Effect.service(Reminders), use));
const taps = (use: (t: ReminderTaps.Shape) => Effect.Effect<unknown>) => run(Effect.flatMap(Effect.service(ReminderTaps), use));

/**
 * The Reminders app.
 * @model spec/clock/reminders.md
 */
export function RemindersScreen({ route, onClose }: ScreenProps) {
  const [openId, setOpenId] = useState<string | undefined>(route);
  const { state: reminders = remindersInitial } = useReminders(runtime);
  const { state: journal = journalInitial } = useJournal(runtime);
  const { state: tap = tapsInitial } = useTaps(runtime);
  const { state: ringer = ringerInitial } = useRinger(runtime);
  const shownId = route !== undefined && route !== openId && reminders.rows.some((r) => r.id === route) ? route : openId;
  const open = (id: string | undefined) => {
    setOpenId(id);
    taps((t) => t.interact());
    remind((r) => r.show(id));
  };
  const onDetail = <A,>(id: string, use: (r: Reminders.Shape) => Effect.Effect<A>) => remind((r) => Effect.andThen(r.show(id), use(r)));
  return (
    <RemindersView
      reminders={reminders}
      unconfirmed={pendingCreations(journal) + unconfirmedChanges(journal)}
      tapPending={tap.banner && tap.stage === "TapIdle"}
      openId={shownId}
      now={ringer.now}
      onOpen={open}
      onBack={() => { remind((r) => r.show(undefined)); onClose(); }}
      onRefresh={() => remind((r) => r.refresh())}
      onCreate={(draft) => remind((r) => r.create(draft))}
      onContinueCreate={(approved) => remind((r) => r.continueCreate(approved))}
      onEdit={(row, draft) => {
        const due = new Date(row.dueAt);
        const moved = draft.minuteOfDay !== due.getHours() * 60 + due.getMinutes() || draft.repeat !== "none" || draft.alertMinutes !== (row.hasAlert ? row.alertMinutes : null) || new Date(new Date().setHours(0, 0, 0, 0) + draft.dayOffset * 86_400_000).getDate() !== due.getDate();
        onDetail(row.id, (r) => r.edit(row.id, draft, moved));
      }}
      onDecide={(row, decision) => onDetail(row.id, (r) => r.decide(row.id, decision))}
      onReopen={(row, mode) => onDetail(row.id, (r) => r.reopen(row.id, mode))}
      onDelete={(row) => onDetail(row.id, (r) => Effect.andThen(r.remove(row.id), Effect.sync(() => setOpenId(undefined))))}
      onSaveTodo={(title) => remind((r) => r.saveTodo(title, ""))}
      onTodo={(row, decision) => remind((r) => r.todo(row.id, decision))}
      onOpenTap={() => taps((t) => t.check(true))}
      onDismissTap={() => taps((t) => t.dismissBanner())}
    />
  );
}
