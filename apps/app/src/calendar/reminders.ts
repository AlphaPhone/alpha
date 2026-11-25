// spec/app/calendar/index.md, "Story: See reminders among my events"
import { dueInstantMs } from "../reminders/recurrence.ts";
import type { ReminderItemRecord, RemindersStoreView } from "../reminders/store.ts";
import type { Row } from "./shown.ts";
import { civilDay, dayStart } from "./time.ts";

export interface DatedReminder {
  readonly id: number;
  readonly begin: number;
  readonly end: number;
  readonly allDay: false;
  readonly title: string;
  readonly record: ReminderItemRecord;
}

export type CalendarRow = Row | DatedReminder;

/** The dated items still visible in Reminders, with their original records. @throws {never} */
export function datedReminders({ snapshot, hiddenIds, itemSpecIds }: RemindersStoreView): DatedReminder[] {
  return snapshot.items.flatMap((record) => {
    const id = itemSpecIds.get(record.id);
    const begin = dueInstantMs(record.dueDate, record.dueMinute);
    if (begin === null || id === undefined || hiddenIds.has(record.id)) return [];
    const end = Math.min(begin + 15 * 60_000, dayStart(civilDay(begin) + 1));
    return [{ id, begin, end, allDay: false, title: record.title, record }];
  });
}

export const calendarRowKey = (row: CalendarRow) => "record" in row ? `reminder:${row.id}` : row.id;
