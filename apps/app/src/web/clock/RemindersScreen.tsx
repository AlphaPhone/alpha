// spec/clock/reminders.md, "Story: See my reminders as the phone holds them"; spec/clock/reminders.md, "Story: Change a reminder exactly once"; spec/clock/reminderTaps.md, "Story: Open the reminder I tapped"; spec/clock/reminderDrafts.md, "Story: Find my unsaved reminder where I left it"
import { useState } from "react";
import { Effect } from "effect";
import { useMachine as useReminders } from "../../../gen/clock__reminders.react.ts";
import { useMachine as useJournal } from "../../../gen/clock__reminderJournal.react.ts";
import { useMachine as useTaps } from "../../../gen/clock__reminderTaps.react.ts";
import { useMachine as useRinger } from "../../../gen/clock__ringer.react.ts";
import { useMachine as useDrafts } from "../../../gen/clock__reminderDrafts.react.ts";
import { initial as remindersInitial } from "../../../gen/clock__reminders.ts";
import { initial as journalInitial, pendingCreations, unconfirmedChanges } from "../../../gen/clock__reminderJournal.ts";
import { initial as tapsInitial } from "../../../gen/clock__reminderTaps.ts";
import { initial as ringerInitial } from "../../../gen/clock__ringer.ts";
import { initial as draftsInitial } from "../../../gen/clock__reminderDrafts.ts";
import { Reminders } from "../../clock/reminders.vibe";
import { ReminderTaps } from "../../clock/reminder-taps.vibe";
import { ReminderDrafts, type DraftForm } from "../../clock/drafts.vibe";
import type { ScreenProps } from "../app-screen.ts";
import { RemindersView } from "./RemindersView.tsx";
import { run, runtime } from "./connect.ts";

const remind = (use: (r: Reminders.Shape) => Effect.Effect<unknown>) => run(Effect.flatMap(Effect.service(Reminders), use));
const taps = (use: (t: ReminderTaps.Shape) => Effect.Effect<unknown>) => run(Effect.flatMap(Effect.service(ReminderTaps), use));
const drafts = (use: (d: ReminderDrafts.Shape) => Effect.Effect<unknown>) => run(Effect.flatMap(Effect.service(ReminderDrafts), use));
const keptOf = (form: DraftForm) => runtime.runSync(Effect.flatMap(Effect.service(ReminderDrafts), (d) => d.kept(form)));

/** What the shell gives the Reminders app: the reminder a route names, and how to leave. */
export type RemindersScreenProps = ScreenProps;

/**
 * The Reminders app.
 * @model spec/clock/reminders.md
 */
export function RemindersScreen({ route, onClose }: RemindersScreenProps) {
  const [openId, setOpenId] = useState<string | undefined>(route);
  const { state: reminders = remindersInitial } = useReminders(runtime);
  const { state: journal = journalInitial } = useJournal(runtime);
  const { state: tap = tapsInitial } = useTaps(runtime);
  const { state: ringer = ringerInitial } = useRinger(runtime);
  const { state: kept = draftsInitial } = useDrafts(runtime);
  const keptNew = kept.creation.tag === "Held" ? keptOf("new") : undefined;
  const keptEdit = kept.edit.tag === "Held" ? keptOf("edit") : undefined;
  const shownId = route !== undefined && route !== openId && reminders.rows.some((r) => r.id === route) ? route : openId;
  const open = (id: string | undefined) => {
    setOpenId(id);
    taps((t) => t.interact());
    remind((r) => r.show(id));
  };
  const onDetail = <A,>(id: string, use: (r: Reminders.Shape) => Effect.Effect<A>) => remind((r) => Effect.andThen(r.show(id), use(r)));
  const settle = (form: DraftForm, id: string, version: number) => Effect.flatMap(Effect.service(ReminderDrafts), (d) => d.settle(form, id, version));
  return (
    <RemindersView
      reminders={reminders}
      keptNew={keptNew?.draft}
      keptEdit={keptEdit === undefined ? undefined : { id: keptEdit.id, revision: keptEdit.revision, draft: keptEdit.draft }}
      discarding={kept.discard.tag === "Discarding"}
      unconfirmed={pendingCreations(journal) + unconfirmedChanges(journal)}
      tapPending={tap.banner && tap.stage === "TapIdle"}
      openId={shownId}
      now={ringer.now}
      onOpen={open}
      onBack={() => { remind((r) => r.show(undefined)); onClose(); }}
      onRefresh={() => remind((r) => r.refresh())}
      onKeep={(form, draft) => {
        const row = reminders.rows.find((r) => r.id === shownId);
        if (form === "new") drafts((d) => d.keep("new", keptNew === undefined ? "" : keptNew.id, "", draft));
        else if (row !== undefined) drafts((d) => d.keep("edit", row.id, keptEdit?.id === row.id ? keptEdit.revision : row.revision, draft));
      }}
      onDiscard={(form) => drafts((d) => d.askDiscard(form))}
      onDiscardAnswer={(confirmed) => drafts((d) => (confirmed ? d.confirmDiscard() : d.cancelDiscard()))}
      onCreate={(draft) => {
        const id = keptNew?.id ?? "";
        remind((r) => Effect.andThen(r.create(draft, id), id === "" ? Effect.void : settle("new", id, keptNew?.version ?? 0)));
      }}
      onContinueCreate={(approved) => remind((r) => Effect.andThen(r.continueCreate(approved), keptNew === undefined ? Effect.void : settle("new", keptNew.id, keptNew.version)))}
      onEdit={(row, draft) => {
        const due = new Date(row.dueAt);
        const moved = draft.minuteOfDay !== due.getHours() * 60 + due.getMinutes() || draft.repeat !== "none" || draft.alertMinutes !== (row.hasAlert ? row.alertMinutes : null) || new Date(new Date().setHours(0, 0, 0, 0) + draft.dayOffset * 86_400_000).getDate() !== due.getDate();
        const editKept = keptEdit?.id === row.id ? keptEdit : undefined;
        const revision = editKept?.revision ?? row.revision;
        onDetail(row.id, (r) => Effect.andThen(r.edit(row.id, revision, draft, moved), editKept === undefined ? Effect.void : settle("edit", row.id, editKept.version)));
      }}
      onDecide={(row, decision) => onDetail(row.id, (r) => r.decide(row.id, row.revision, decision))}
      onReopen={(row, mode) => onDetail(row.id, (r) => r.reopen(row.id, row.revision, mode))}
      onDelete={(row) => onDetail(row.id, (r) => Effect.andThen(r.remove(row.id, row.revision), Effect.sync(() => setOpenId(undefined))))}
      onSaveTodo={(title) => remind((r) => r.saveTodo(title, ""))}
      onTodo={(row, decision) => remind((r) => r.todo(row.id, row.revision, decision))}
      onOpenTap={() => taps((t) => t.check(true))}
      onDismissTap={() => taps((t) => t.dismissBanner())}
    />
  );
}
