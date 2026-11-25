// spec/app/calendar/index.md, "Story: See reminders among my events"; spec/app/reminders/index.md, "Story: Create, update, flag, move, complete and delete reminders with Undo"
import { Button, CalendarEventMenu, CalendarEventPage, CalendarEventRow, CalendarEventRows } from "@repo/ui";
import { Effect } from "effect";
import { Bell, Repeat } from "lucide-react";
import { Machine as Calendar } from "../../gen/app__calendar.effect.vibe";
import * as Shell from "../../gen/app__shell.effect.vibe";
import { snoozeSelectedReminder } from "../reminders/alerts.vibe";
import { beginEditReminder } from "../reminders/editor.vibe";
import { deleteReminderItem, toggleReminderComplete } from "../reminders/reminders.vibe";
import { remindersStore, type ReminderItemRecord } from "../reminders/store.ts";
import type { Alpha } from "../runtime/area.tsx";
import type { CalendarProps } from "./Calendar.tsx";
import type { DatedReminder } from "./reminders.ts";

const hour = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const date = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" });

function noteFor(item: ReminderItemRecord): string {
  if (item.completed) return "Completed · no further alarm scheduled";
  if (item.alertMinutes === null) return "No alert · saved on this device";
  if (item.notifiedAtMs !== null) return "Notification posted";
  return [item.snoozedUntilMs === null ? "" : `Snoozed until ${new Date(item.snoozedUntilMs).toLocaleString()}`,
    "Scheduled. Alerts may arrive a few minutes late."].filter(Boolean).join("\n");
}

function alertCaption(minutes: number): string {
  if (minutes === 0) return "Alert at start";
  if (minutes >= 60) return `Alert ${minutes / 60} hour before`;
  return `Alert ${minutes} min before`;
}

export function ReminderPage({ alpha, runtime, row, onBack }: { alpha: Alpha; runtime: CalendarProps["runtime"]; row: DatedReminder; onBack: () => void }) {
  const { record, begin } = row;
  const doCurrent = (change: (item: ReminderItemRecord) => void) => () => {
    const view = runtime.runSync(Effect.flatMap(Calendar, (calendar) => calendar.get()));
    const still = remindersStore.snapshot();
    const item = still.snapshot.items.find(({ id }) => id === record.id);
    if (!view.front || view.reminder !== row.id || still.hiddenIds.has(record.id) || item?.revision !== record.revision) return;
    change(item);
  };
  const edit = doCurrent((item) => {
    void alpha.runtime.runPromise(Effect.gen(function* () {
      const shell = yield* Shell.Machine;
      const state = yield* shell.get();
      if (!Shell.canOpenView(state, "Reminders")) return;
      yield* beginEditReminder(item);
      yield* Effect.ignore(shell.send({ type: "openView", view: "Reminders" }));
    }));
  });
  const remove = doCurrent((item) => { void alpha.runtime.runPromise(deleteReminderItem(item.id, item.revision)); });
  const toggle = doCurrent((item) => { void alpha.runtime.runPromise(toggleReminderComplete(item.id, item.revision)); });
  const snooze = doCurrent((item) => { void alpha.runtime.runPromise(snoozeSelectedReminder(item.id, item.revision)); });
  const oneTime = record.recurrence === "none";
  const words = [record.notes, noteFor(record)].filter(Boolean).join("\n");
  return (
    <CalendarEventPage title={record.title} when={`Due ${hour.format(begin)}`} day={date.format(begin)} source="Reminders" notes={words} onBack={onBack}
      actions={<CalendarEventMenu items={[{ label: "Edit", name: "Edit event", onSelect: edit }, { label: "Delete", name: "Delete event", onSelect: remove }]} />}>
      <div className={record.alertMinutes === null ? "mt-5 pb-5" : "mt-5"}>
        <span role="img" aria-label={oneTime ? record.completed ? "Completed." : "One-time reminder." : record.recurrence} className="block text-muted-foreground">
          <Repeat aria-hidden className="size-4.5" />
        </span>
        {!record.completed || oneTime ? <div className="mt-3.5 flex flex-wrap gap-2">
          <Button size="lg" variant={record.completed ? "secondary" : "primary"} className={record.completed ? "h-13 rounded-lg px-4 text-base font-normal" : "h-13 rounded-lg bg-foreground px-4 text-base font-normal text-background hover:bg-foreground/90"}
            aria-label={record.completed ? "Reopen reminder" : "Complete reminder occurrence"} onClick={toggle}>{record.completed ? "Reopen" : "Done"}</Button>
          {!record.completed && record.alertMinutes !== null ? <Button size="lg" variant="secondary" className="h-13 rounded-lg px-4 text-base font-normal" aria-label="Snooze reminder 10 minutes" onClick={snooze}>10 min</Button> : null}
        </div> : null}
      </div>
      {record.alertMinutes !== null ? <CalendarEventRows><CalendarEventRow icon={<Bell />} text={alertCaption(record.alertMinutes)} /></CalendarEventRows> : null}
    </CalendarEventPage>
  );
}
