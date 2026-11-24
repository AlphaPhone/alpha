// spec/app/calendar/index.md, "Rows shown are for the day the calendar is anchored to, from a source it may read"
import type { Source } from "../../gen/app__calendar.ts";

/** One event as the screen shows it; the spec counts these and names the open one by `id`. */
export interface Row {
  readonly id: number;
  readonly source: Source;
  readonly key: string;
  readonly calendarId: string;
  readonly title: string;
  readonly place: string;
  readonly notes: string;
  readonly begin: number;
  readonly end: number;
  readonly allDay: boolean;
  readonly recurring: boolean;
  readonly link: string;
  readonly video: string;
  /** How many times Calendar has seen this event change since the page opened: the revision the form builds on. */
  readonly revision: number;
}

/** What a source answered for one day, before it has a number. */
export type Read = Omit<Row, "id" | "source" | "revision">;

const numbers = new Map<string, number>();
const seen = new Map<string, { readonly content: string; readonly revision: number }>();
const days = new Map<Source, { readonly day: number; readonly rows: ReadonlyArray<Row> }>();
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

/** The revision of `row`: one more each time a read shows it different from the last. @throws {never} */
function revised(source: Source, row: Read): number {
  const name = `${source}:${row.key}`;
  const content = JSON.stringify([row.title, row.place, row.notes, row.begin, row.end, row.allDay]);
  const before = seen.get(name);
  const revision = before === undefined ? 0 : before.content === content ? before.revision : before.revision + 1;
  seen.set(name, { content, revision });
  return revision;
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
  /** Keep what `source` answered for `day`, numbered. @throws {never} */
  keep(source: Source, day: number, read: ReadonlyArray<Read>): ReadonlyArray<Row> {
    const rows = read.map((row) => ({ ...row, source, id: numbered(source, row.key), revision: revised(source, row) }));
    days.set(source, { day, rows });
    version += 1;
    for (const listener of [...listeners]) listener();
    return rows;
  },
  /** The rows of `source` for `day`, or none. @throws {never} */
  of(source: Source, day: number): ReadonlyArray<Row> {
    const kept = days.get(source);
    return kept !== undefined && kept.day === day ? kept.rows : [];
  },
  /** Whether this phone has calendars of its own: a browser has none, and is never asked for access. @throws {never} */
  present: (): boolean => present,
  /** @throws {never} */
  phone(has: boolean): void {
    present = has;
    version += 1;
    for (const listener of [...listeners]) listener();
  },
  /** The event numbered `id`, wherever it was last read. @throws {never} */
  find(id: number): Row | undefined {
    for (const { rows } of days.values()) {
      const row = rows.find((candidate) => candidate.id === id);
      if (row !== undefined) return row;
    }
    return undefined;
  },
};
