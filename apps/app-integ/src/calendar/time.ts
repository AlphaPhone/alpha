// spec/calendar/editor.md, "A missing or repeated wall time is refused, and nothing is saved"; spec/calendar/presentation.md, "An interval shows UTC offsets only when they differ at its ends, and its dates only when they differ"

const DAY = 86_400_000;

/** The device's IANA time zone. @throws {never} */
export function deviceZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Whether `zone` is a time zone Intl supports, nonempty, at most 128 units and without NUL. @throws {never} */
export function validZone(zone: string): boolean {
  if (!zone || zone.length > 128 || zone.includes("\0")) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** The wall clock of `instant` in `zone` as `YYYY-MM-DDTHH:MM:SS.mmm`, or undefined for an unknown zone. @throws {never} */
export function calendarWall(instant: number, zone: string): string | undefined {
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
      timeZone: zone, calendar: "iso8601", numberingSystem: "latn", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(instant).map((part) => [part.type, part.value]));
    const millis = String(((instant % 1000) + 1000) % 1000).padStart(3, "0");
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${millis}`;
  } catch {
    return undefined;
  }
}

/** A civil wall time read as if it were UTC, or undefined when it is no real date. @throws {never} */
export function civil(text: string): number | undefined {
  const at = Date.parse(`${text}Z`);
  return Number.isFinite(at) && new Date(at).toISOString().slice(0, 10) === text.slice(0, 10) ? at : undefined;
}

/** How a wall time resolves in a zone: one instant, none (a clock gap) or two (a clock overlap). */
export type WallResolution = { readonly kind: "exists"; readonly at: number } | { readonly kind: "missing" } | { readonly kind: "twice"; readonly at: number };

/** Every instant whose wall clock in `zone` is `wall`, earliest first. @throws {never} */
function candidates(wall: string, zone: string): number[] {
  const desired = civil(wall);
  if (desired === undefined) return [];
  const normalized = new Date(desired).toISOString().slice(0, -1);
  const offsets = new Set<number>();
  for (let hours = -48; hours <= 48; hours += 6) {
    const probe = desired + hours * 3_600_000;
    const probed = calendarWall(probe, zone);
    const read = probed === undefined ? undefined : civil(probed);
    if (read !== undefined) offsets.add(read - probe);
  }
  return [...offsets].map((offset) => desired - offset).filter((at) => calendarWall(at, zone) === normalized).sort((a, b) => a - b);
}

/** How the civil wall time `wall` resolves in `zone`. @throws {never} */
export function resolveWall(wall: string, zone: string): WallResolution {
  const found = [...new Set(candidates(wall, zone))];
  if (found.length === 0) return { kind: "missing" };
  return found.length === 1 ? { kind: "exists", at: found[0]! } : { kind: "twice", at: found[0]! };
}

/**
 * The instant of a saved wall time: the original instant when it still reads back the same, the earliest of an
 * overlap, and for a clock gap undefined, or with `forward` the first instant after it. @throws {never}
 */
export function calendarInstant(wall: string, zone: string, original: number, gap: "reject" | "forward" = "reject"): number | undefined {
  const desired = civil(wall);
  if (desired === undefined) return undefined;
  if (Number.isFinite(original) && calendarWall(original, zone) === new Date(desired).toISOString().slice(0, -1)) return original;
  const found = candidates(wall, zone);
  if (found.length > 0) return found[0];
  if (gap !== "forward") return undefined;
  for (let minutes = 1; minutes <= 180; minutes += 1) {
    const later = new Date(desired + minutes * 60_000).toISOString().slice(0, -1);
    const next = candidates(later, zone);
    if (next.length > 0) return next[0];
  }
  return undefined;
}

/** The zone's offset from UTC at `instant`, in minutes. @throws {never} */
export function offsetMinutes(instant: number, zone: string): number {
  const wall = calendarWall(instant, zone);
  const read = wall === undefined ? undefined : civil(wall);
  return read === undefined ? 0 : Math.round((read - instant) / 60_000);
}

/** The civil day number of `instant` in `zone` (days since 1970-01-01). @throws {never} */
export function civilDay(instant: number, zone: string): number {
  const wall = calendarWall(instant, zone);
  const read = wall === undefined ? undefined : civil(`${wall.slice(0, 10)}T00:00:00`);
  return read === undefined ? Math.floor(instant / DAY) : Math.round(read / DAY);
}

/** Local midnight `days` after the civil day of `instant` in `zone`. @throws {never} */
export function midnightAfter(instant: number, zone: string, days: number): number {
  const day = civilDay(instant, zone) + days;
  const wall = new Date(day * DAY).toISOString().slice(0, -1);
  return calendarInstant(wall, zone, Number.NaN, "forward") ?? day * DAY;
}

/** A UTC instant at millisecond precision as the canonical ISO string. @throws {never} */
export function isoInstant(instant: number): string {
  return Number.isFinite(instant) ? new Date(instant).toISOString() : "";
}

/** A date and time in the owner's locale, for review sheets and detail lines. @throws {never} */
export function formatDateTime(instant: number, zone: string, withZone = false): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: zone, year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      ...(withZone ? { timeZoneName: "short" as const } : {}),
    }).format(instant);
  } catch {
    return new Date(instant).toISOString();
  }
}

/** A time of day in the owner's locale. @throws {never} */
export function formatTime(instant: number, zone: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { timeZone: zone, hour: "numeric", minute: "2-digit" }).format(instant);
  } catch {
    return new Date(instant).toISOString().slice(11, 16);
  }
}

/** A long date in the owner's locale, such as a schedule heading. @throws {never} */
export function formatLongDate(instant: number, zone: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { timeZone: zone, weekday: "long", month: "long", day: "numeric" }).format(instant);
  } catch {
    return new Date(instant).toISOString().slice(0, 10);
  }
}

/** A short month and day, with the year when `year` is set. @throws {never} */
export function formatMonthDay(instant: number, zone: string, year = false): string {
  try {
    return new Intl.DateTimeFormat(undefined, { timeZone: zone, month: "short", day: "numeric", ...(year ? { year: "numeric" as const } : {}) }).format(instant);
  } catch {
    return new Date(instant).toISOString().slice(0, 10);
  }
}

/** An hour label for the timeline. @throws {never} */
export function formatHour(hour: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", timeZone: "UTC" }).format(Date.UTC(2000, 0, 1, hour % 24));
  } catch {
    return `${String(hour % 24).padStart(2, "0")}:00`;
  }
}

/** The weekday and day number of a column heading. @throws {never} */
export function formatDayLabel(instant: number, zone: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { timeZone: zone, weekday: "short", day: "numeric" }).format(instant);
  } catch {
    return new Date(instant).toISOString().slice(5, 10);
  }
}

/** The name of a month for the date picker. @throws {never} */
export function formatMonthName(month: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, { month: "long", timeZone: "UTC" }).format(Date.UTC(2000, month, 1));
  } catch {
    return String(month + 1);
  }
}

/** A UTC instant as an ISO wall time without its zone letter, or "" when it is no instant. @throws {never} */
export function isoWall(instant: number): string {
  return Number.isFinite(instant) && Math.abs(instant) <= 8.64e15 ? new Date(instant).toISOString().slice(0, -1) : "";
}
