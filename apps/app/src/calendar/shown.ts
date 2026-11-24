// spec/app/calendar/index.md, "Rows shown are for the day the calendar is anchored to, from a source it may read"; spec/app/calendar/presentation.md, "A read for a day covers the month before it through the month after next"
import type { Source } from "../../gen/app__calendar.ts";
import { rowShown } from "../../gen/app__calendar__presentation.ts";
import type { OwnAnswer } from "../../gen/app__calendar__writing.ts";
import { civilDay } from "./time.ts";

/** One of an event's people: the organizer, or a guest with the reply the calendar gave. */
export interface Person {
  readonly name: string;
  readonly organizer: boolean;
  readonly status: string;
}

/** One event as the screen shows it; the spec counts these and names the open one by `id`. */
export interface Row {
  readonly id: number;
  readonly source: Source;
  readonly key: string;
  readonly calendarId: string;
  /** The calendar's number as Calendar and Home hide it: 0 is the agent's, any other one of the phone's. */
  readonly calendar: number;
  readonly title: string;
  readonly place: string;
  readonly notes: string;
  readonly begin: number;
  readonly end: number;
  readonly allDay: boolean;
  readonly recurring: boolean;
  /** The event's own page, where the presentation rules offer it, or "". */
  readonly link: string;
  readonly video: string;
  readonly people: ReadonlyArray<Person>;
  /** The owner's own answer to the invitation, and whether Going and Maybe may be offered for it. */
  readonly answer: OwnAnswer;
  readonly answerable: boolean;
  /** The provider's version of the event, which a write names, or "" where the calendar keeps none. */
  readonly version: string;
  /** The revision the form builds on: the provider's change time where it has one, otherwise one more each time a read shows it different. */
  readonly revision: number;
}

/** What a source answered, before it has a number. */
export type Read = Omit<Row, "id" | "source" | "revision" | "calendar"> & { readonly changedAt?: number };

const numbers = new Map<string, number>();
const calendars = new Map<string, number>();
const seen = new Map<string, { readonly content: string; readonly revision: number }>();
const windows = new Map<Source, ReadonlyArray<Row>>();
const listeners = new Set<() => void>();
let version = 0;
let present = false;

/** The number an event keeps for the life of the page, so the open event stays the same one across reads. @throws {never} */
function numbered(source: Source, key: string): number {
  const name = `${source}:${key}`;
  const known = numbers.get(name);
  if (known !== undefined) return known;
  const made = numbers.size + 1;
  numbers.set(name, made);
  return made;
}

/** The number a phone calendar is hidden by: its own where Android numbers it, otherwise one it keeps for the page. @throws {never} */
function calendarNumber(source: Source, calendarId: string): number {
  if (source === "Google") return 0;
  const own = Number(calendarId);
  if (Number.isInteger(own) && own > 0) return own;
  const known = calendars.get(calendarId);
  if (known !== undefined) return known;
  const made = 1_000_000 + calendars.size;
  calendars.set(calendarId, made);
  return made;
}

/** The revision of `row`: its change time in seconds where the calendar keeps one, otherwise a count of the changes this page saw. @throws {never} */
function revised(source: Source, row: Read): number {
  if (row.changedAt !== undefined && Number.isFinite(row.changedAt)) return Math.floor(row.changedAt / 1000);
  const name = `${source}:${row.key}`;
  const content = JSON.stringify([row.title, row.place, row.notes, row.begin, row.end, row.allDay]);
  const before = seen.get(name);
  const revision = before === undefined ? 0 : before.content === content ? before.revision : before.revision + 1;
  seen.set(name, { content, revision });
  return revision;
}

/** Whether `row` falls on civil `day`: an all-day event by its dates, a timed one by its instants. @throws {never} */
export function onDay(row: Pick<Row, "begin" | "end">, day: number): boolean {
  const first = civilDay(row.begin);
  const last = civilDay(Math.max(row.begin, row.end - 1));
  return first <= day && day <= last;
}

function told(): void {
  version += 1;
  for (const listener of [...listeners]) listener();
}

/** The rows each source last gave, as an external store a screen reads without an effect. */
export const shown = {
  snapshot: (): number => version,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Keep what `source` answered for the window around `day`, numbered; the rows that fall on `day`. @throws {never} */
  keep(source: Source, day: number, read: ReadonlyArray<Read>): ReadonlyArray<Row> {
    const rows = read.map(({ changedAt, ...row }) => ({
      ...row, source, id: numbered(source, row.key), calendar: calendarNumber(source, row.calendarId), revision: revised(source, { ...row, changedAt }),
    }));
    windows.set(source, [...rows].sort((a, b) => a.begin - b.begin));
    told();
    return rows.filter((row) => onDay(row, day));
  },
  /** The rows of `source` that fall on `day`, or none. @throws {never} */
  of(source: Source, day: number): ReadonlyArray<Row> {
    return (windows.get(source) ?? []).filter((row) => onDay(row, day));
  },
  /** Every row the last read of `source` found, in time order. @throws {never} */
  all(source: Source): ReadonlyArray<Row> {
    return windows.get(source) ?? [];
  },
  /** The rows of both sources the owner has not hidden, in time order. @throws {never} */
  visible(hidden: ReadonlyArray<number>, phone: boolean, google: boolean): ReadonlyArray<Row> {
    const both = [...(phone ? shown.all("Phone") : []), ...(google ? shown.all("Google") : [])];
    return both.filter((row) => rowShown(row.calendar, [...hidden])).sort((a, b) => a.begin - b.begin);
  },
  /** Forget what `source` read: an account changed or a permission went. @throws {never} */
  drop(source: Source): void {
    windows.delete(source);
    told();
  },
  /** Whether this phone has calendars of its own: a browser has none, and is never asked for access. @throws {never} */
  present: (): boolean => present,
  /** @throws {never} */
  phone(has: boolean): void {
    present = has;
    told();
  },
  /** The event numbered `id`, wherever it was last read. @throws {never} */
  find(id: number): Row | undefined {
    for (const rows of windows.values()) {
      const row = rows.find((candidate) => candidate.id === id);
      if (row !== undefined) return row;
    }
    return undefined;
  },
};
