/** Milliseconds in a 24-hour day. */
export const DAY_MS = 86400000;

/** UTC midnight (ms) of the date's calendar day, read in device-local time or, with `utc`, in UTC. */
export const civilDay = (date: Date, utc = false): number => Date.UTC(utc ? date.getUTCFullYear() : date.getFullYear(), utc ? date.getUTCMonth() : date.getMonth(), utc ? date.getUTCDate() : date.getDate());

/** Whole device-local calendar days from `b` to `a` (positive when `a` is later). */
export const civilDayDiff = (a: Date, b: Date): number => (civilDay(a) - civilDay(b)) / DAY_MS;

/** The device's IANA time zone as reported by `Intl` with no fallback; callers choose one (for example `|| 'UTC'`) when the zone is empty. */
export const deviceTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;
