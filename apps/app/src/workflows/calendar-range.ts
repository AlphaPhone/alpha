// spec/workflows/deviceSteps.md, "A named calendar range reads today, tomorrow, the next three days or this week from local midnight, and an all-day event counts by its civil dates"
import { inMeeting, rangeDays, rangeStartDay } from "../../gen/workflows__deviceSteps.ts";

/** A named range as instants: local midnights for timed events, UTC civil dates for all-day events. */
export interface CalendarRange {
  readonly begin: number;
  readonly end: number;
  readonly civilBegin: number;
  readonly civilEnd: number;
}

/** One calendar event a range or a meeting check reads. */
export interface RangeEvent {
  readonly begin: number;
  readonly end: number;
  readonly allDay?: boolean;
  readonly video?: boolean;
  readonly who?: ReadonlyArray<unknown>;
}

const civil = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * The range a label names from `now`, or undefined for a label that names none.
 * @throws {never}
 */
export function workflowCalendarRange(label: string, now: Date = new Date()): CalendarRange | undefined {
  const text = label.toLowerCase().replaceAll("’", "'");
  const days = rangeDays(text);
  if (days === 0) return undefined;
  const begin = new Date(now);
  begin.setHours(0, 0, 0, 0);
  begin.setDate(begin.getDate() + rangeStartDay(text, begin.getDay()));
  const end = new Date(begin);
  end.setDate(end.getDate() + days);
  return { begin: begin.getTime(), end: end.getTime(), civilBegin: civil(begin), civilEnd: civil(end) };
}

/**
 * The span a calendar read must cover so that both timed and all-day events of `range` are found.
 * @throws {never}
 */
export function readSpan(range: CalendarRange): { readonly begin: number; readonly end: number } {
  return { begin: Math.min(range.begin, range.civilBegin), end: Math.max(range.end, range.civilEnd) };
}

/**
 * The events of `events` that fall in `range`: an all-day event by its civil dates, a timed one by its instants.
 * @throws {never}
 */
export function eventsInRange<E extends RangeEvent>(events: ReadonlyArray<E>, range: CalendarRange): ReadonlyArray<E> {
  return events.filter((e) => (e.allDay === true ? e.begin < range.civilEnd && e.end > range.civilBegin : e.begin < range.end && e.end > range.begin));
}

/**
 * Whether one of `events` is a meeting under way at `now`.
 * @throws {never}
 */
export function workflowInMeeting(events: ReadonlyArray<RangeEvent>, now: number): boolean {
  return events.some((e) => inMeeting(e.allDay === true, e.begin, e.end, now, e.video === true, Array.isArray(e.who) ? e.who.length : 0));
}
