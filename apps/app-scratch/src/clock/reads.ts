// spec/clock/reminderReads.md, "Story: Let a workflow read today's reminders only as I reviewed"
// The owner day a reviewed workflow step reads, worked out in the time zone it names.
import { digestOf } from "./page.ts";

const DAY = 86_400_000;
const OPEN: ReadonlySet<string> = new Set(["pending", "scheduled", "posted", "permission-denied", "scheduling-failed"]);

/** What the store lists of one reminder, as far as a read looks at it. */
export interface ListedReminder {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly undated?: boolean;
  readonly at?: number;
  readonly dueAt?: number;
  readonly completedAt?: number;
  readonly history?: ReadonlyArray<{ readonly completedAt: number; readonly dueAt?: number }>;
}

/** One shared reminder: its id, title, due time, status and completion time, and the revision that binds them. */
export type SharedReminder =
  | { readonly id: string; readonly revision: string; readonly title: string; readonly dueAt: string; readonly status: "open" }
  | { readonly id: string; readonly revision: string; readonly title: string; readonly dueAt: string; readonly status: "completed"; readonly completedAt: string };

/** What a day's read answers: the shared reminders, or more than the step allows and how many of those were overdue. */
export type DayRead =
  | { readonly kind: "reminders"; readonly reminders: SharedReminder[] }
  | { readonly kind: "overflow"; readonly maximumItems: number; readonly overdue: number };

function civilDay(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(instant));
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return Date.parse(`${part("year")}-${part("month")}-${part("day")}T00:00:00Z`);
}

function firstOfDay(wallDay: number, timeZone: string): number {
  let low = wallDay - 72_000_000;
  let high = wallDay + 72_000_000;
  while (high - low > 1_000) {
    const candidate = low + Math.floor((high - low) / 2_000) * 1_000;
    if (civilDay(candidate, timeZone) < wallDay) low = candidate;
    else high = candidate;
  }
  return high;
}

/**
 * The first instant of `day` (YYYY-MM-DD) in `timeZone`, and of the day after.
 * @throws {RangeError} when `timeZone` is not one the phone knows
 */
export function dayBounds(day: string, timeZone: string): { start: number; end: number } {
  const wall = Date.parse(`${day}T00:00:00Z`);
  return { start: firstOfDay(wall, timeZone), end: firstOfDay(wall + DAY, timeZone) };
}

const iso = (at: number) => new Date(at).toISOString();

/** The reminders of the reviewed day: open ones due by its end, overdue included, and those completed during it; none at all past `maximumItems`. */
export async function readDay(listed: readonly ListedReminder[], day: string, timeZone: string, maximumItems: number): Promise<DayRead> {
  const { start, end } = dayBounds(day, timeZone);
  const rows: Array<{ id: string; title: string; dueAt: number; completedAt?: number }> = [];
  for (const r of listed) {
    if (r.undated === true) continue;
    const dueAt = r.dueAt ?? r.at;
    if (dueAt === undefined || !Number.isFinite(dueAt)) continue;
    if (OPEN.has(r.status) && dueAt < end) rows.push({ id: r.id, title: r.title, dueAt });
    if (r.status === "completed" && r.completedAt !== undefined && r.completedAt >= start && r.completedAt < end) rows.push({ id: r.id, title: r.title, dueAt, completedAt: r.completedAt });
    for (const done of r.history ?? []) {
      if (done.dueAt !== undefined && done.completedAt >= start && done.completedAt < end) rows.push({ id: r.id, title: r.title, dueAt: done.dueAt, completedAt: done.completedAt });
    }
  }
  const unique = [...new Map(rows.map((row) => [JSON.stringify([row.id, row.dueAt, row.completedAt === undefined]), row])).values()]
    .sort((a, b) => a.dueAt - b.dueAt || a.id.localeCompare(b.id));
  if (unique.length > maximumItems) return { kind: "overflow", maximumItems, overdue: unique.filter((row) => row.completedAt === undefined && row.dueAt < start).length };
  const reminders = await Promise.all(unique.map(async (row): Promise<SharedReminder> => {
    const dueAt = iso(row.dueAt);
    if (row.completedAt === undefined) return { id: row.id, revision: await digestOf([row.id, row.title, dueAt, "open", null]), title: row.title, dueAt, status: "open" };
    const completedAt = iso(row.completedAt);
    return { id: row.id, revision: await digestOf([row.id, row.title, dueAt, "completed", completedAt]), title: row.title, dueAt, status: "completed", completedAt };
  }));
  return { kind: "reminders", reminders };
}
