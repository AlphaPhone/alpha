// spec/calendar/presentation.md, "Story: Read the presentation of times"; spec/calendar/presentation.md, "Story: Search my events and list what is coming"
import { firstColumnDay, monthRows, showsDayRange, showsOffsets, timelineFirstHour, timelineLastHour, timelineShift } from "../../../gen/calendar__presentation.ts";
import type { AgentView } from "../../calendar/agent.vibe";
import type { DeviceRead } from "../../calendar/device.vibe";
import { type CalendarRow, DAY, agentRow } from "../../calendar/model.vibe";
import { civilDay, formatDateTime, formatDayLabel, formatLongDate, formatMonthDay, formatTime, midnightAfter, offsetMinutes } from "../../calendar/time.ts";

export const HOUR_PX = 56;

/** Every row Calendar can show now: the agent's published or saved feed and the device's last read, minus hidden ones. */
export function calendarRows(agent: AgentView, device: DeviceRead, zone: string, now: number, hidden: (row: CalendarRow) => boolean): CalendarRow[] {
  const agentRows = (agent.feed?.events ?? []).flatMap((event) => {
    const row = agentRow(event, agent.calendars, zone, now);
    return row === undefined ? [] : [row];
  });
  const today = civilDay(now, zone);
  const deviceRows: CalendarRow[] = device.events.map((event) => {
    const calendar = device.calendars.find((candidate) => candidate.id === event.calendarId);
    const allDay = event.allDay === true;
    const offset = allDay ? Math.floor(event.begin / DAY) - today : civilDay(event.begin, zone) - today;
    return {
      id: `device:${event.id}:${event.begin}`, source: "device", sourceKey: `native:${event.calendarId}`, title: event.title || "Untitled event",
      notes: event.body, where: event.location, begin: event.begin, end: event.end, allDay, offset,
      endOffset: allDay ? offset + Math.max(1, Math.ceil((event.end - event.begin) / DAY)) : civilDay(event.end - 1, zone) - today + 1,
      revision: event.revision, calendarName: calendar?.name || "Android Calendar", account: calendar?.account || "Device calendar",
      writable: calendar?.writable === true, recurring: event.recurring === true, timeZone: event.timeZone ?? zone,
    };
  });
  return [...agentRows, ...deviceRows].filter((row) => !hidden(row)).sort((a, b) => a.begin - b.begin || a.id.localeCompare(b.id));
}

/** Whether a row overlaps day `offset`: all-day by its dates, timed by its instants. */
export function onDay(row: CalendarRow, offset: number): boolean {
  return row.allDay ? row.offset <= offset && offset < row.endOffset : row.offset <= offset && offset < row.endOffset;
}

/** Every typed word, case-folded, appears in the title, place or notes. */
export function rowMatches(row: CalendarRow, query: string): boolean {
  const fold = (text: string) => text.normalize("NFKC").toLocaleLowerCase();
  const haystack = fold(`${row.title}\n${row.where}\n${row.notes}`);
  return fold(query).split(/\s+/).filter((word) => word !== "").every((word) => haystack.includes(word));
}

/** One schedule or search heading and its events. */
export interface ListGroup { readonly key: string; readonly label: string; readonly items: readonly { readonly row: CalendarRow; readonly time: string }[] }

/** The schedule (from today) or search (the whole window) as day groups; each event is listed once, on its first listed day. */
export function listGroups(rows: readonly CalendarRow[], from: number, to: number, query: string | null, zone: string, now: number): ListGroup[] {
  const today = civilDay(now, zone);
  const picked = rows.filter((row) => !(row.end <= from || row.begin >= to) && (query === null || rowMatches(row, query)));
  const dayOf = (row: CalendarRow) => civilDay(Math.max(row.begin, from), zone) - today;
  const sorted = [...picked].sort((a, b) => dayOf(a) - dayOf(b) || Number(b.allDay) - Number(a.allDay) || a.begin - b.begin || a.title.localeCompare(b.title));
  const groups = new Map<number, { row: CalendarRow; time: string }[]>();
  for (const row of sorted) {
    const days = row.endOffset - row.offset;
    const time = row.allDay ? (days > 1 ? `All day · until ${formatMonthDay(row.end - 1, "UTC")}` : "All day")
      : civilDay(row.end, zone) !== civilDay(row.begin, zone) ? `${formatTime(row.begin, zone)} – ${formatMonthDay(row.end, zone)} ${formatTime(row.end, zone)}`
      : `${formatTime(row.begin, zone)} – ${formatTime(row.end, zone)}`;
    groups.set(dayOf(row), [...(groups.get(dayOf(row)) ?? []), { row, time }]);
  }
  return [...groups].map(([offset, items]) => {
    const at = midnightAfter(now, zone, offset);
    const long = formatLongDate(at, zone);
    return { key: String(offset), label: offset === 0 ? `Today · ${long}` : offset === 1 ? `Tomorrow · ${long}` : long, items };
  });
}

/** The dates a list covers, for its range line. */
export function coveredRange(from: number, to: number, zone: string): string {
  return `${formatMonthDay(from, zone, true)} – ${formatMonthDay(to - 1, zone, true)}`;
}

/** A timed row clipped to one day column, placed on the timeline. */
export interface Segment { readonly row: CalendarRow; readonly top: number; readonly height: number }

/** The timeline of one day: its hour range, rows placed in pixels, and whether "now" shows on it. */
export interface Timeline { readonly first: number; readonly last: number; readonly height: number; readonly segments: readonly Segment[]; readonly allDay: readonly CalendarRow[]; readonly nowTop: number | undefined }

/** Lay out one day: 07:00–23:00 grown to hold every timed row, each clipped to the day. */
export function timeline(rows: readonly CalendarRow[], offset: number, zone: string, now: number): Timeline {
  const start = midnightAfter(now, zone, offset);
  const end = midnightAfter(now, zone, offset + 1);
  const timed = rows.filter((row) => !row.allDay && row.begin < end && row.end > start);
  const hours = timed.map((row) => {
    const from = Math.max(row.begin, start);
    const until = Math.min(row.end, end);
    const t = (from - start) / 3_600_000;
    const finish = until >= end ? 24 : (until - start) / 3_600_000;
    return { row, t, d: Math.min(24 - t, Math.max(0.25, finish > t ? finish - t : (row.end - row.begin) / 3_600_000)) };
  });
  const earliest = Math.min(7, ...hours.map((hour) => Math.floor(hour.t)));
  const latest = Math.max(23, ...hours.map((hour) => Math.ceil(hour.t + hour.d)));
  const first = timelineFirstHour(earliest);
  const last = timelineLastHour(latest);
  const shift = timelineShift(earliest);
  const nowHour = (now - start) / 3_600_000;
  return {
    first, last, height: Math.max(912 + shift, (last - first) * HOUR_PX + 16),
    segments: hours.map((hour) => ({ row: hour.row, top: (hour.t - first) * HOUR_PX + 8, height: Math.max(14, hour.d * HOUR_PX) })),
    allDay: rows.filter((row) => row.allDay && onDay(row, offset)),
    nowTop: offset === 0 && nowHour >= first && nowHour <= last ? (nowHour - first) * HOUR_PX + 8 : undefined,
  };
}

/** The visible day columns: three or more lead with the previous day. */
export function visibleDays(day: number, columns: number): number[] {
  const first = firstColumnDay(day, columns);
  return Array.from({ length: columns }, (_, index) => first + index);
}

/** A column heading. */
export function dayLabel(offset: number, zone: string, now: number): string {
  return formatDayLabel(midnightAfter(now, zone, offset), zone);
}

/** One cell of the month grid, Monday first. */
export interface MonthCell { readonly offset: number; readonly label: string; readonly inMonth: boolean; readonly busy: boolean }

/** The month grid around the selected day shifted by `month` months: five or six weeks, Monday first. */
export function monthGrid(day: number, month: number, rows: readonly CalendarRow[], zone: string, now: number): { readonly title: string; readonly cells: readonly MonthCell[] } {
  const selected = new Date(midnightAfter(now, zone, day));
  const firstOfMonth = Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth() + month, 1);
  const shown = new Date(firstOfMonth);
  const daysInMonth = new Date(Date.UTC(shown.getUTCFullYear(), shown.getUTCMonth() + 1, 0)).getUTCDate();
  const leading = (shown.getUTCDay() + 6) % 7;
  const today = civilDay(now, zone);
  const firstOffset = Math.floor(firstOfMonth / DAY) - today - leading;
  const cells = Array.from({ length: monthRows(daysInMonth, leading) }, (_, index) => {
    const offset = firstOffset + index;
    const date = new Date((today + offset) * DAY);
    return { offset, label: String(date.getUTCDate()), inMonth: date.getUTCMonth() === shown.getUTCMonth(), busy: rows.some((row) => onDay(row, offset)) };
  });
  return { title: `${shown.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" })}`, cells };
}

/** An event's time lines: offsets only where they differ at its ends, dates only where they differ. */
export function intervalDetail(row: CalendarRow): { readonly when: string; readonly day: string | undefined } {
  if (row.allDay) {
    const first = formatMonthDay(row.begin, "UTC", true);
    const last = formatMonthDay(row.end - 1, "UTC", true);
    return { when: "All day", day: first === last ? first : `${first} – ${last}` };
  }
  const zone = row.timeZone;
  const offsets = showsOffsets(offsetMinutes(row.begin, zone), offsetMinutes(row.end, zone));
  const sameDay = !showsDayRange(civilDay(row.begin, zone), civilDay(row.end, zone));
  return {
    when: `${formatTime(row.begin, zone)}${offsets ? ` ${utcOffset(row.begin, zone)}` : ""} – ${formatTime(row.end, zone)}${offsets ? ` ${utcOffset(row.end, zone)}` : ""}`,
    day: sameDay ? formatDateTime(row.begin, zone).split(",").slice(0, 2).join(",") : `${formatMonthDay(row.begin, zone, true)} – ${formatMonthDay(row.end, zone, true)}`,
  };
}

function utcOffset(instant: number, zone: string): string {
  const minutes = offsetMinutes(instant, zone);
  const sign = minutes < 0 ? "-" : "+";
  const absolute = Math.abs(minutes);
  return `UTC${sign}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
}
