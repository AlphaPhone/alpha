// spec/app/calendar/index.md, "Story: See reminders among my events"; spec/app/reminders/index.md, "Story: Create, update, flag, move, complete and delete reminders with Undo"
import { Button, CalendarEventMenu, CalendarEventPage } from "@repo/ui";
import { Effect } from "effect";
import { Repeat } from "lucide-react";
import { Machine as Calendar } from "../../gen/app__calendar.effect.vibe";
import * as Shell from "../../gen/app__shell.effect.vibe";
import { beginEditReminder } from "../reminders/editor.vibe";
import { deleteReminderItem, toggleReminderComplete } from "../reminders/reminders.vibe";
import { remindersStore, type ReminderItemRecord } from "../reminders/store.ts";
import type { Alpha } from "../runtime/area.tsx";
import type { CalendarProps } from "./Calendar.tsx";
import type { DatedReminder } from "./reminders.ts";

const hour = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const date = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" });
const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" });

function noteFor(item: ReminderItemRecord): string {
  if (item.completed) return "Completed · no further alarm scheduled";
  if (item.snoozedUntilMs !== null) return `Snoozed until ${dateTime.format(item.snoozedUntilMs)}`;
  if (item.alertMinutes === null) return "No alert · saved on this device";
  return item.notifiedAtMs === null ? "Alerts may arrive a few minutes late." : "Notification posted";
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
  const oneTime = record.recurrence === "none";
  const words = [record.notes, noteFor(record)].filter(Boolean).join("\n");
  return (
    <CalendarEventPage title={record.title} when={`Due ${hour.format(begin)}`} day={date.format(begin)} source="Reminders" notes={words} onBack={onBack}
      actions={<CalendarEventMenu items={[{ label: "Edit", name: "Edit event", onSelect: edit }, { label: "Delete", name: "Delete event", onSelect: remove }]} />}>
      <div className="mt-5 pb-5">
        <span role="img" aria-label={oneTime ? record.completed ? "Completed." : "One-time reminder." : record.recurrence} className="block text-muted-foreground">
          <Repeat aria-hidden className="size-4.5" />
        </span>
        {!record.completed || oneTime ? (
          <Button size="lg" variant={record.completed ? "secondary" : "primary"} className={record.completed ? "mt-3.5 h-13 rounded-lg px-4 text-base" : "mt-3.5 h-13 rounded-lg bg-foreground px-4 text-base text-background hover:bg-foreground/90"}
            aria-label={record.completed ? "Reopen reminder" : "Complete reminder occurrence"} onClick={toggle}>{record.completed ? "Reopen" : "Done"}</Button>
        ) : null}
      </div>
    </CalendarEventPage>
  );
}
