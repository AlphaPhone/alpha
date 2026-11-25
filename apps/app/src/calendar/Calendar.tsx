// spec/app/calendar/index.md, "Story: See my days"; spec/app/calendar/index.md, "Story: Move through the days"; spec/app/calendar/index.md, "Story: Look at an event"; spec/app/calendar/index.md, "Story: Search my events and choose which calendars I see"; spec/app/calendar/editor.md, "Story: Write an event"; spec/app/calendar/agent.md, "Story: Approve what the agent changes"; spec/app/calendar/deletions.md, "Story: Undo a deletion before it is sent"
import {
  type CalendarBlock, CalendarAgendaRow, CalendarAnswer, CalendarAnswers, CalendarChip, CalendarDayChips, CalendarEventAction, CalendarEventBlock, CalendarEventMenu, CalendarEventPage,
  CalendarEventRow, CalendarEventRows, CalendarFieldRow, CalendarFormCard, CalendarFormDate, CalendarFormPage, CalendarFormRow, CalendarFormTitle, CalendarHeader, CalendarSwitch,
  CalendarHeaderAction, CalendarInvite, CalendarJoin, CalendarList, CalendarListHeading, CalendarMonthPanel, CalendarNotice, CalendarNoticeAction, CalendarNotesField,
  CalendarPerson, CalendarPickerField, CalendarSearchBar, CalendarPill, CalendarTimeline, CalendarTimeRow, CalendarWeekStrip, Label, ListGroup, ListRow, Sheet, SheetContent, Spinner, Switch, Toast,
} from "@repo/ui";
import type { ManagedRuntime } from "effect";
import {
  Calendar as CalendarIcon, CalendarDays, ChevronRight, MapPin, Plus, Repeat, RotateCcw, Search, Settings, TextAlignStart, UserRound, Video, X,
} from "lucide-react";
import { type ReactNode, useState, useSyncExternalStore } from "react";
import * as View from "../../gen/app__calendar.ts";
import { useMachine as useView } from "../../gen/app__calendar.react.ts";
import type * as Changes from "../../gen/app__calendar__agent.ts";
import { useMachine as useChanges } from "../../gen/app__calendar__agent.react.ts";
import * as Editor from "../../gen/app__calendar__editor.ts";
import * as Link from "../../gen/app__calendar__link.ts";
import { useMachine as useLink } from "../../gen/app__calendar__link.react.ts";
import { setUp } from "./link.vibe";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import type { Alpha } from "../runtime/area.tsx";
import { AppBack } from "../shell/AppBack.tsx";
import { useMachine as useEditor } from "../../gen/app__calendar__editor.react.ts";
import { useMachine as useHeld } from "../../gen/app__calendar__deletions.react.ts";
import type { Event as DeletionEvent } from "../../gen/app__calendar__deletions.ts";
import {
  type ReplyWord, dayEmptiness, firstColumnDay, monthCells, replyWord, rowShown, showsOffsets, statusAction, timelineFirstHour, timelineLastHour,
} from "../../gen/app__calendar__presentation.ts";
import { type SaveBlock, goingOffered, managedDeleteOffered, maybeOffered, saveBlock } from "../../gen/app__calendar__writing.ts";
import { type Deletions, type Reach, rowHidden } from "../../gen/app__calendar__deletions.ts";
import { type RequestStatus, requestStatus } from "../../gen/app__calendar__agent.ts";
import { type Request, requests } from "./requests.ts";
import type { Calendared } from "./calendar.vibe";
import { type Fields, kept, startForm, typed } from "./editor.vibe";
import { type Row, onDay, shown } from "./shown.ts";
import { allows } from "../../gen/kit__permission.ts";
import { civilDay, dateOf, dayStart, monthStart, readWindow, weekStart } from "./time.ts";

export interface CalendarProps {
  /** Provides Calendar's machines, `calendared` of calendar.vibe. */
  runtime: ManagedRuntime.ManagedRuntime<Calendared, unknown>;
  /** Alpha, for the shell's Back in Calendar's own header. */
  alpha?: Alpha;
}

const hourMinute = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const hourOnly = new Intl.DateTimeFormat(undefined, { hour: "numeric" });
const shortDate = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });
const monthDay = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const longDate = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
const monthOnly = new Intl.DateTimeFormat(undefined, { month: "long" });
const monthYear = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const narrowDay = new Intl.DateTimeFormat(undefined, { weekday: "narrow" });
const shortDay = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const cellLabel = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

const views: ReadonlyArray<{ layout: View.Layout; label: string }> = [
  { layout: "Timeline", label: "Day" },
  { layout: "Agenda", label: "Schedule" },
  { layout: "Columns", label: "Days" },
];

const changes: Readonly<Record<Changes.Change, string>> = { Create: "Create an event", Update: "Change an event", Delete: "Delete an event", Respond: "Answer an invitation" };
const replies: Readonly<Record<Changes.Reply, string>> = { NoReply: "", Going: "Going", Maybe: "Maybe", NotGoing: "Not going" };
const results: Partial<Record<Changes.Result, string>> = {
  Done: "Done, and seen in your calendar.",
  NotFound: "Sent, but Calendar could not find the change.",
  Refused: "Your agent didn't make the change. Nothing changed.",
  InDoubt: "Alpha can't tell whether this change was made. It won't be sent again.",
  Declined: "Declined. Nothing changed.",
  DeletedByReceipt: "Deleted.",
  Unverified: "Sent, but Calendar couldn't check it yet.",
};

const statuses: Readonly<Record<RequestStatus, string>> = {
  StatusUnavailable: "Unavailable", StatusExpired: "Expired", StatusAwaiting: "Waiting for you", StatusApprovalUnavailable: "Approval unavailable",
  StatusRetryable: "Retryable", StatusDeclined: "Declined", StatusClosed: "Closed", StatusNotConfirmed: "Not confirmed",
};

const occurrences: Readonly<Record<Request["occurrences"], string>> = {
  "": "", instance: "This occurrence only", this_and_following: "This and following occurrences", series: "Every event in the series",
};

const words: Readonly<Record<ReplyWord, string>> = {
  NoReplyWord: "", WordOrganizer: "Organizer", WordAwaiting: "Invited", WordGoing: "", WordMaybe: "Maybe",
  WordDeclined: "Declined", WordDelegated: "Delegated", WordInvited: "Invited",
};

const repeats: ReadonlyArray<{ repeat: NonNullable<Fields["repeat"]>; label: string }> = [
  { repeat: "NoRepeat", label: "Once" }, { repeat: "Daily", label: "Daily" }, { repeat: "Weekly", label: "Weekly" },
  { repeat: "Monthly", label: "Monthly" }, { repeat: "Yearly", label: "Yearly" },
];

const saveOff: Readonly<Record<SaveBlock, string>> = {
  SaveAllowed: "", WaitLoading: "Loading…", WaitSaving: "Saving…", OtherAccount: "This draft belongs to another account.",
  CheckEvent: "This event changed. Check it before saving.", AddTitle: "",
};

const hourMs = 3_600_000;
const quarter = 15 * 60_000;

// spec/app/calendar/deletions.md, "A deletion hides its event, the series from this occurrence on, or the whole series, and only rows of the same source"
/** Whether a deletion waiting, being sent or awaiting its read hides `row`. */
function deletedNow(d: Deletions | undefined, row: Row): boolean {
  if (!d) return false;
  return [d.waiting, d.sending, d.hiding].some((id) => {
    if (id === 0) return false;
    const held = shown.lastSeen(id);
    if (!held) return row.id === id;
    const reach: Reach = id === d.waiting ? d.reach : "OneEvent";
    return rowHidden(reach, row.id === id, held.series !== "" && row.series === held.series, row.begin >= held.begin, row.source === held.source);
  });
}

/** A time as the timeline's blocks give it: "9:30", without the part of the day. */
function clock(ms: number): string {
  return hourMinute.formatToParts(ms).filter((part) => part.type !== "dayPeriod").map((part) => part.value).join("").trim();
}

/** A civil day as Calendar names it: Today, Tomorrow, Yesterday, or its short date. */
function dayName(day: number, today: number): string {
  if (day === today) return "Today";
  if (day === today + 1) return "Tomorrow";
  if (day === today - 1) return "Yesterday";
  return shortDate.format(dateOf(day));
}

/** The hours from midnight of `ms` on civil `day`. */
function hoursInto(ms: number, day: number): number {
  return (ms - dayStart(day)) / hourMs;
}

const offset = (ms: number) => -new Date(ms).getTimezoneOffset();
const utc = (minutes: number) => `UTC${minutes < 0 ? "−" : "+"}${String(Math.floor(Math.abs(minutes) / 60)).padStart(2, "0")}:${String(Math.abs(minutes) % 60).padStart(2, "0")}`;

// spec/app/calendar/presentation.md, "An interval shows UTC offsets only when they differ at its ends, and its dates only when they differ"
/** An event's time as its page says it: its dates where they differ, and the UTC offsets where a clock change falls inside it. */
function interval(row: Row): string {
  const last = Math.max(row.begin, row.end - 1);
  const spans = civilDay(row.begin) !== civilDay(last);
  if (row.allDay) return spans ? `${monthDay.format(row.begin)} – ${monthDay.format(last)} · All day` : "All day";
  const zones = showsOffsets(offset(row.begin), offset(row.end)) ? [` (${utc(offset(row.begin))})`, ` (${utc(offset(row.end))})`] : ["", ""];
  if (spans) return `${monthDay.format(row.begin)} ${hourMinute.format(row.begin)}${zones[0]} – ${monthDay.format(last)} ${hourMinute.format(row.end)}${zones[1]}`;
  if (zones[0] !== "") return `${hourMinute.format(row.begin)}${zones[0]} – ${hourMinute.format(row.end)}${zones[1]}`;
  return hourMinute.formatRange(row.begin, row.end);
}

/** The time of a row in the schedule or search results. */
function listTime(row: Row): string {
  if (row.allDay) return "All day";
  const same = civilDay(row.begin) === civilDay(Math.max(row.begin, row.end - 1));
  return `${hourMinute.format(row.begin)} – ${same ? "" : `${monthDay.format(row.end)} `}${hourMinute.format(row.end)}`;
}

// spec/app/calendar/presentation.md, "The timeline runs from seven to midnight and grows to hold every event of the day"
/** The first and last hour the timeline of `day` draws: seven to eleven at night, earlier or later only for an event that needs it. */
function span(rows: ReadonlyArray<Row>, day: number): { first: number; last: number } {
  const timed = rows.filter((row) => !row.allDay);
  const startHour = (row: Row) => (civilDay(row.begin) < day ? 0 : new Date(row.begin).getHours());
  const endHour = (row: Row) => (civilDay(Math.max(row.begin, row.end - 1)) > day ? 24 : Math.ceil(hoursInto(row.end, day)));
  return { first: timelineFirstHour(Math.min(7, ...timed.map(startHour))), last: Math.min(24, timelineLastHour(Math.max(23, ...timed.map(endHour)))) };
}

/** Each timed event of `day` in its lane, side by side where events overlap. */
function lanes(rows: ReadonlyArray<Row>, day: number): ReadonlyArray<{ row: Row; start: number; length: number; lane: number; lanes: number }> {
  const timed = rows.filter((row) => !row.allDay).map((row) => {
    const start = Math.max(0, hoursInto(row.begin, day));
    return { row, start, length: Math.min(24, hoursInto(row.end, day)) - start };
  }).sort((a, b) => a.start - b.start || b.length - a.length);
  const ends: number[] = [];
  const laneOf = timed.map(({ start, length }) => {
    const lane = ends.findIndex((end) => end <= start + 0.001);
    const at = lane === -1 ? ends.length : lane;
    ends[at] = start + length;
    return at;
  });
  return timed.map((one, at) => {
    const own = laneOf[at] ?? 0;
    const count = timed.reduce((most, other, index) => (index !== at && other.start < one.start + one.length && other.start + other.length > one.start
      ? Math.max(most, Math.max(laneOf[index] ?? 0, own) + 1) : most), 1);
    return { ...one, lane: own, lanes: count };
  });
}

/** A row's calendar color: the agent's own calendar in the accent, every other in the text color. */
function stripe(row: Row): "primary" | "foreground" {
  return row.source === "Google" && /(^|\/)primary$/.test(row.calendarId) ? "primary" : "foreground";
}

/** Up to two initials of a name or an address. */
function initials(name: string): string {
  const parts = name.replace(/@.*/, "").split(/[\s._-]+/).filter((part) => part !== "");
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

/** A local `HH:MM` of `ms`, and a local `YYYY-MM-DD`. */
function timeValue(ms: number): string {
  const at = new Date(ms);
  return `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
}
function dateValue(ms: number): string {
  const at = new Date(ms);
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
}

/** A length of time as the form says it: "1 h", "30 min", "1 h 15 min". */
function duration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h} h` : "", m ? `${m} min` : ""].filter((part) => part !== "").join(" ");
}

/** Calendar: the anchored day from the phone's calendar and the agent's, an event, its form, and the agent's card. */
export function Calendar({ runtime, alpha }: CalendarProps) {
  const view = useView(runtime);
  const editor = useEditor(runtime);
  const deleting = useHeld(runtime).state;
  useSyncExternalStore((listener) => shown.subscribe(listener), () => shown.snapshot(), () => shown.snapshot());
  const s = view.state;
  if (!s) return <Spinner />;
  const send = (event: View.Event) => () => void view.send(event);
  const visible = shown.visible(s.hidden, allows(s.access), s.connected).filter((row) => !deletedNow(deleting, row));
  const dayRows = (day: number) => visible.filter((row) => onDay(row, day));
  const opening = (row: Row): View.Event => ({ type: "openEvent", id: row.id, place: row.place !== "", video: row.video !== "", local: row.source === "Phone", web: row.link !== "" });
  const openRow = (row: Row) => {
    const day = civilDay(row.begin);
    if (view.can(opening(row))) return () => void view.send(opening(row));
    if (view.can({ type: "pickDay", day })) return () => void view.send({ type: "pickDay", day }).then(() => view.send(opening(row)));
    return undefined;
  };
  const newEvent: Editor.Event = { type: "newEvent", day: s.anchor };
  const open = s.open === 0 ? undefined : shown.find(s.open);
  const cut = s.connected && shown.partial("Google");
  const free = dayEmptiness(!cut, allows(s.access) && s.phoneLimited, View.empty(s)) === "DayFree";
  const searching = s.overlay === "Search";
  const listing = searching || s.layout === "Agenda";
  const month = s.overlay === "MonthDialog" || s.overlay === "LayoutMenu";
  const anchorDate = dateOf(s.anchor);
  const title = anchorDate.getFullYear() === dateOf(s.today).getFullYear() ? monthOnly.format(anchorDate) : monthYear.format(anchorDate);
  const now = s.readAt > 0 ? hoursInto(s.readAt, s.anchor) : undefined;
  const invites = visible.filter((row) => row.answer === "AnswerAwaited" && row.end > dayStart(s.today));
  const week = Array.from({ length: 7 }, (_, at) => weekStart(s.anchor) + at).map((day) => ({
    key: day, letter: narrowDay.format(dateOf(day)), date: dateOf(day).getDate(), label: longDate.format(dateOf(day)),
    today: day === s.today, selected: day === s.anchor, busy: dayRows(day).length > 0,
    onPick: view.can({ type: "pickDay", day }) ? send({ type: "pickDay", day }) : day === s.anchor ? () => undefined : undefined,
  }));
  const block = (row: Row, day: number, placed: { start: number; length: number; lane: number; lanes: number }): CalendarBlock => ({
    key: row.id, title: row.title || "Untitled event", sub: row.place || (row.video ? "Video call" : ""), time: clock(Math.max(row.begin, dayStart(day))),
    label: `${row.title || "Untitled event"}, ${clock(row.begin)}`, ...placed, tone: row.answer === "AnswerAwaited" ? "invite" : "plain", stripe: stripe(row), onOpen: openRow(row),
  });
  const dayEmpty = (text: string) => (
    <>
      <CalendarIcon aria-hidden className="size-7" />
      {text}
      {statusAction(s.connected, false) === "OfferSettings" && view.can({ type: "openAccountSettings" }) ? (
        <button type="button" aria-label="Open Calendar settings" onClick={send({ type: "openAccountSettings" })}
          className="mt-1.5 flex min-h-11 items-center gap-1.5 rounded-full bg-secondary px-4 text-sm leading-plain font-semibold text-foreground">
          <Settings aria-hidden className="size-4.5" />Settings
        </button>
      ) : null}
    </>
  );
  const rows = dayRows(s.anchor);
  const allDay = rows.filter((row) => row.allDay);
  const columns = s.layout === "Columns" ? Array.from({ length: 3 }, (_, at) => firstColumnDay(s.anchor, 3) + at) : [];
  const hours = (() => {
    const { first, last } = span(columns.length > 0 ? columns.flatMap(dayRows) : rows, s.anchor);
    return Array.from({ length: Math.min(last, 23) - first + 1 }, (_, at) => first + at).map((hour) => ({ hour, label: hourOnly.format(dayStart(s.anchor) + hour * hourMs) }));
  })();
  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden leading-plain">
      <div data-alpha-subview="calendar-list" inert={open !== undefined || editor.state?.shown === true} className="flex min-h-0 flex-1 flex-col">
        <CalendarHeader title={title} expanded={month} onTitle={month ? send({ type: "closeOverlay" }) : view.can({ type: "openMonth" }) ? send({ type: "openMonth" }) : undefined}
          className="pr-2 pl-2" leading={alpha ? <AppBack alpha={alpha} className="size-13 [&_svg]:size-5.5" /> : null}>
          {month ? null : view.can({ type: "goToday" }) ? <CalendarHeaderAction aria-label="Today" onClick={send({ type: "goToday" })}><CalendarDays aria-hidden /></CalendarHeaderAction> : null}
          {!month && view.can({ type: "openSearch" }) ? <CalendarHeaderAction aria-label="Search events" onClick={send({ type: "openSearch" })}><Search aria-hidden /></CalendarHeaderAction> : null}
          {!month && editor.can(newEvent) ? <CalendarHeaderAction aria-label="New event" onClick={() => void runtime.runPromise(startForm(newEvent, s.anchor))}><Plus aria-hidden /></CalendarHeaderAction> : null}
        </CalendarHeader>
        {searching ? <Searching runtime={runtime} /> : null}
        <Access runtime={runtime} />
        {s.phoneLimited ? <CalendarNotice tone="caution">Android gave only part of this day. Some events may be missing.</CalendarNotice> : null}
        {cut ? <CalendarNotice tone="caution">Google gave only part of your agent's calendar. Some events may be missing.</CalendarNotice> : null}
        {s.phone.status === "Failed" || s.google.status === "Failed" ? (
          <CalendarNotice tone="caution" actions={view.can({ type: "refresh" }) ? <CalendarNoticeAction aria-label="Retry" onClick={send({ type: "refresh" })}><RotateCcw aria-hidden />Retry</CalendarNoticeAction> : null}>
            Calendar couldn't read this day.
          </CalendarNotice>
        ) : null}
        {editor.state?.filed ? <CalendarNotice>{editor.state.kind === "Reply" ? "Your answer waits for your approval below." : "This change waits for your approval below."}</CalendarNotice> : null}
        <Drafts runtime={runtime} day={s.anchor} />
        <Proposal runtime={runtime} />
        {listing ? null : (
          <>
            <CalendarWeekStrip days={week} />
            {invites.length > 0 && !month ? (
              <div data-alpha-calendar-invites="" className="flex shrink-0 flex-col gap-2 px-4 pb-2">
                {invites.map((row) => <Invite key={row.id} runtime={runtime} row={row} today={s.today} onOpen={openRow(row)} />)}
              </div>
            ) : null}
            {allDay.length > 0 && columns.length === 0 ? (
              <div data-alpha-calendar-all-day="" className="flex max-h-33 shrink-0 gap-2.5 overflow-y-auto pr-4 pb-2 pl-3">
                <span className="w-9.5 shrink-0 pt-3 text-right text-2xs leading-plain text-muted-foreground">All day</span>
                <div className="flex min-w-0 grow flex-col gap-1.5">
                  {allDay.map((row) => (
                    <button key={row.id} type="button" aria-label={`${row.title || "Untitled event"}, All day`} disabled={!openRow(row)} onClick={openRow(row)}
                      className="min-h-10 rounded-md bg-secondary px-4 py-2.5 text-left text-sm font-semibold">{row.title || "Untitled event"}</button>
                  ))}
                </div>
              </div>
            ) : null}
            {columns.length > 0 ? (
              <div aria-hidden className="grid shrink-0 pr-4 pb-1.5 pl-15 text-meta font-semibold text-muted-foreground" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
                {columns.map((day) => <span key={day} className={day === s.today ? "truncate pl-2 text-primary" : "truncate pl-2"}>{`${shortDay.format(dateOf(day))} ${dateOf(day).getDate()}`}</span>)}
              </div>
            ) : null}
            <CalendarTimeline hours={hours}
              blocks={columns.length > 0 ? [] : lanes(rows, s.anchor).map((placed) => block(placed.row, s.anchor, placed))}
              now={s.anchor === s.today && columns.length === 0 ? now : undefined}
              empty={columns.length > 0 ? (columns.every((day) => dayRows(day).length === 0) && free ? dayEmpty("Free on these days") : undefined)
                : free && s.reminders === 0 ? dayEmpty(s.anchor === s.today ? "Nothing scheduled today" : "Free all day") : undefined}
              columns={columns.length > 0 ? (
                <div data-alpha-calendar-days="" className="absolute inset-y-0 right-4 left-15 grid" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
                  {columns.map((day) => (
                    <div key={day} role="group" aria-label={longDate.format(dateOf(day))} aria-current={day === s.today ? "date" : undefined} className="relative border-l border-border">
                      {lanes(dayRows(day), day).map((placed) => {
                        const one = block(placed.row, day, placed);
                        return <ColumnBlock key={one.key} block={one} first={hours[0]?.hour ?? 7} />;
                      })}
                    </div>
                  ))}
                </div>
              ) : null} />
            {s.reminders > 0 ? <CalendarNotice className="mt-2">{s.reminders === 1 ? "1 reminder" : `${s.reminders} reminders`}</CalendarNotice> : null}
          </>
        )}
        {s.layout === "Agenda" && !searching ? (
          <CalendarList aria-label="Schedule" range={`Through ${monthDay.format(readWindow(s.anchor).end - 1)}`}>
            <Days rows={visible.filter((row) => row.end > dayStart(s.today))} today={s.today} from={dayStart(s.today)} open={openRow} empty="No upcoming events" />
          </CalendarList>
        ) : null}
      </div>
      {month ? <Month runtime={runtime} /> : null}
      <Calendars runtime={runtime} />
      {open === undefined ? null : <EventPage runtime={runtime} row={open} today={s.today} />}
      {editor.state?.shown ? <Form runtime={runtime} day={s.anchor} today={s.today} connected={s.connected} /> : null}
      <Undo runtime={runtime} />
    </div>
  );
}

/** A block of one of several days side by side, without its start time. */
function ColumnBlock({ block, first }: { block: CalendarBlock; first: number }) {
  const lanesShown = Math.max(1, block.lanes);
  return <CalendarEventBlock block={block} first={first} showTime={false} style={{ left: `${(block.lane * 100) / lanesShown}%`, width: `calc(${100 / lanesShown}% - 4px)` }} />;
}

/** Each day's heading and its events, from `from` on; `empty` where there are none. */
function Days({ rows, today, from, open, empty }: { rows: ReadonlyArray<Row>; today: number; from: number; open: (row: Row) => (() => void) | undefined; empty: string }) {
  const days = new Map<number, Row[]>();
  for (const row of [...rows].sort((a, b) => a.begin - b.begin)) {
    const day = civilDay(Math.max(row.begin, from));
    days.set(day, [...(days.get(day) ?? []), row]);
  }
  if (days.size === 0) {
    return <p className="flex items-center gap-2 text-sm leading-normal text-muted-foreground"><CalendarIcon aria-hidden className="size-4.5 shrink-0" />{empty}</p>;
  }
  return [...days].map(([day, listed]) => (
    <section key={day}>
      <CalendarListHeading>{day === today ? `Today · ${longDate.format(dateOf(day))}` : day === today + 1 ? `Tomorrow · ${longDate.format(dateOf(day))}` : longDate.format(dateOf(day))}</CalendarListHeading>
      {listed.map((row) => <CalendarAgendaRow key={row.id} time={listTime(row)} title={row.title || "Untitled event"} where={row.place} disabled={!open(row)} onClick={open(row)} />)}
    </section>
  ));
}

// spec/app/calendar/writing.md, "An invitee answers Going or Maybe from the invitation; Decline stays the deletion's decline"
/** An invitation waiting over the days: decline it, or answer Going. */
function Invite({ runtime, row, today, onOpen }: CalendarProps & { row: Row; today: number; onOpen?: () => void }) {
  const editor = useEditor(runtime);
  const held = useHeld(runtime);
  const organizer = row.people.find((person) => person.organizer);
  const going: Editor.Event = { type: "respond", id: row.id, revision: row.revision, going: true, offered: goingOffered(row.answer, row.answerable) };
  const decline = { type: "confirm", id: row.id, reach: "OneEvent", revision: row.revision, now: untimed } as const;
  const declinable = row.cancel === "DeclineInvitation" && row.editable && managedDeleteOffered(row.managed) && held.can(decline)
    && editor.can({ type: "deleteEvent", id: row.id, revision: row.revision, scope: "ThisOne", repeating: row.recurring });
  return (
    <CalendarInvite initials={initials(organizer?.name ?? row.title)} title={row.title || "Untitled event"}
      when={`${dayName(civilDay(row.begin), today)} · ${row.allDay ? "All day" : hourMinute.format(row.begin)}`} onOpen={onOpen}
      onDecline={declinable ? () => void held.send(decline) : undefined} onAccept={editor.can(going) ? () => void editor.send(going) : undefined} />
  );
}

// spec/app/calendar/index.md, "The layout menu and the month dialog open over the days, never over an open event"; spec/app/calendar/index.md, "Picking a day in the week strip or the month dialog shows that day's timeline"
/** The month dialog: a month's days to pick from, the layouts, and the calendars shown. */
function Month({ runtime }: CalendarProps) {
  const view = useView(runtime);
  const [shift, setShift] = useState(0);
  const s = view.state;
  if (!s) return null;
  const first = monthStart(s.anchor, shift);
  const firstDate = dateOf(first);
  const lead = (firstDate.getDay() + 6) % 7;
  const cells = monthCells(monthStart(s.anchor, shift + 1) - first, lead);
  const visible = shown.visible(s.hidden, allows(s.access), s.connected);
  const anchorDate = dateOf(s.anchor);
  const toMonth = (year: number, month: number) => setShift((year - anchorDate.getFullYear()) * 12 + month - anchorDate.getMonth());
  const close = () => void view.send({ type: "closeOverlay" });
  const choose = (layout: View.Layout) => async () => {
    if (s.overlay === "MonthDialog") {
      await view.send({ type: "closeOverlay" });
      await view.send({ type: "openLayoutMenu" });
    }
    await view.send({ type: "chooseLayout", layout });
  };
  const calendars = async () => {
    await view.send({ type: "closeOverlay" });
    await view.send({ type: "openCalendars" });
  };
  const offered = views.filter(({ layout }) => layout !== "Columns" || s.wide);
  return (
    <CalendarMonthPanel month={firstDate.getMonth()} year={firstDate.getFullYear()}
      months={Array.from({ length: 12 }, (_, at) => ({ value: at, label: monthOnly.format(new Date(2000, at, 1)) }))}
      years={Array.from({ length: 11 }, (_, at) => firstDate.getFullYear() - 5 + at).map((year) => ({ value: year, label: String(year) }))}
      onMonth={(month) => toMonth(firstDate.getFullYear(), month)} onYear={(year) => toMonth(year, firstDate.getMonth())}
      onPrevious={() => setShift(shift - 1)} onNext={() => setShift(shift + 1)} onClose={close}
      days={Array.from({ length: cells }, (_, at) => first - lead + at).map((day) => ({
        key: day, date: dateOf(day).getDate(), label: cellLabel.format(dateOf(day)).replace(",", ""), outside: dateOf(day).getMonth() !== firstDate.getMonth(),
        today: day === s.today, selected: day === s.anchor, busy: visible.some((row) => onDay(row, day)),
        onPick: view.can({ type: "pickDay", day }) ? () => void view.send({ type: "pickDay", day }) : day === s.anchor ? close : undefined,
      }))}>
      <div role="group" aria-label="Calendar view" className="mt-3 flex flex-wrap gap-2">
        {offered.map(({ layout, label }) => (
          <CalendarPill key={layout} pressed={s.layout === layout} disabled={s.layout !== layout && !(s.overlay === "LayoutMenu" ? view.can({ type: "chooseLayout", layout }) : view.can({ type: "closeOverlay" }))}
            onClick={s.layout === layout ? undefined : () => void choose(layout)()}>{label}</CalendarPill>
        ))}
        <CalendarPill onClick={() => void calendars()}>Calendars</CalendarPill>
      </div>
    </CalendarMonthPanel>
  );
}

// spec/app/calendar/index.md, "A switch of the Calendars sheet hides or shows one calendar"
/** The Calendars sheet: each calendar with its switch, and the Google row. */
function Calendars({ runtime }: CalendarProps) {
  const view = useView(runtime);
  const s = view.state;
  if (!s) return null;
  return (
    <Sheet open={s.overlay === "CalendarsSheet"} onOpenChange={(opened) => (opened ? undefined : void view.send({ type: "closeOverlay" }))}>
      <SheetContent title="Calendars">
        {[...new Map([...shown.all("Google"), ...shown.all("Phone")].map((row) => [row.calendar, row])).values()].map((row) => (
          <Label key={row.calendar} className="flex items-center justify-between">
            {row.source === "Google" ? "Your agent's calendar" : `Phone calendar ${row.calendarId}`}
            <Switch checked={rowShown(row.calendar, [...s.hidden])} disabled={!view.can({ type: "toggleCalendar", calendar: row.calendar })}
              onCheckedChange={() => void view.send({ type: "toggleCalendar", calendar: row.calendar })} />
          </Label>
        ))}
        <GoogleRow runtime={runtime} />
      </SheetContent>
    </Sheet>
  );
}

// spec/app/calendar/index.md, "Story: Let Calendar read my phone's calendar"
function Access({ runtime }: CalendarProps) {
  const view = useView(runtime);
  useSyncExternalStore((listener) => shown.subscribe(listener), () => shown.snapshot(), () => shown.snapshot());
  if (!view.state || !shown.present()) return null;
  if (view.can({ type: "askAccess" })) {
    return <CalendarNotice actions={<CalendarNoticeAction onClick={() => void view.send({ type: "askAccess" })}>Allow</CalendarNoticeAction>}>Calendar needs access to your phone's calendar.</CalendarNotice>;
  }
  if (view.can({ type: "openSettings" })) {
    return (
      <CalendarNotice tone="caution" actions={<CalendarNoticeAction aria-label="Open Calendar settings" onClick={() => void view.send({ type: "openSettings" })}><Settings aria-hidden />Settings</CalendarNoticeAction>}>
        Calendar can't read your phone's calendar.
      </CalendarNotice>
    );
  }
  return null;
}

// spec/app/calendar/index.md, "Story: Look at an event"; spec/app/calendar/editor.md, "Story: Delete an event, or answer an invitation"; spec/app/calendar/deletions.md, "Confirming a deletion holds it; a deletion still waiting is sent first, so the only Undo shown is the newest"
/** An open event over the days: its time, day and calendar, video call, place, people and notes, and what can be done with it. */
function EventPage({ runtime, row, today }: CalendarProps & { row: Row; today: number }) {
  const view = useView(runtime);
  const editor = useEditor(runtime);
  const held = useHeld(runtime);
  const s = view.state;
  if (!s || !editor.state || !held.state) return null;
  const close = () => void view.send({ type: "closeEvent" });
  const edit: Editor.Event = { type: "editEvent", id: row.id, revision: row.revision, day: civilDay(row.begin), repeats: row.recurring };
  const deletable = row.editable && managedDeleteOffered(row.managed) && row.cancel !== "NoCancellation";
  const remove = (reach: Reach) => {
    const confirmed = { type: "confirm", id: row.id, reach, revision: row.revision, now: untimed } as const;
    const scope: Editor.Scope = reach === "WholeSeries" ? "WholeSeries" : reach === "FromThisOn" ? "ThisAndFollowing" : "ThisOne";
    return deletable && held.can(confirmed) && editor.can({ type: "deleteEvent", id: row.id, revision: row.revision, scope, repeating: row.recurring })
      ? () => void held.send(confirmed).then(() => view.send({ type: "closeEvent" })) : undefined;
  };
  const respond = (going: boolean, offered: boolean): Editor.Event => ({ type: "respond", id: row.id, revision: row.revision, going, offered });
  const going = respond(true, goingOffered(row.answer, row.answerable));
  const maybe = respond(false, maybeOffered(row.answer, row.answerable));
  const uncertain = editor.state.latched.includes(row.id);
  const one = remove("OneEvent");
  const following = row.recurring && row.source === "Google" ? remove("FromThisOn") : undefined;
  const series = row.recurring ? remove("WholeSeries") : undefined;
  const decline = row.cancel === "DeclineInvitation" ? one : undefined;
  const editing = row.editable && editor.can(edit);
  const deletes: ReadonlyArray<{ label: string; act: (() => void) | undefined }> = row.cancel === "DeclineInvitation" ? [] : [
    { label: row.recurring ? "Delete this one" : "Delete", act: one },
    { label: "Delete this and following", act: following },
    { label: "Delete the series", act: series },
  ];
  const menu = editing || deletes.some(({ act }) => act !== undefined);
  const organizer = row.people.find((person) => person.organizer);
  const invited = row.answer !== "NotInvited";
  const notices: ReactNode[] = [
    !row.editable ? "This calendar can't be changed here. Edit it in its own app." : null,
    row.editable && row.managed ? "Delete or decline this event in Google Calendar." : null,
  ].filter((text) => text !== null).map((text) => <div key={text} className="mt-3 text-sm leading-plain text-muted-foreground">{text}</div>);
  return (
    <CalendarEventPage title={row.title || "Untitled event"} onBack={close} when={interval(row)} day={dayName(civilDay(row.begin), today)}
      source={row.source === "Phone" ? "Phone calendar" : "Your agent's calendar"} dot={stripe(row)} notes={row.notes}
      actions={menu ? (
        <CalendarEventMenu items={[
          ...(editing ? [{ label: "Edit", name: "Edit event", onSelect: () => void runtime.runPromise(startForm(edit, civilDay(row.begin), row)) }] : []),
          ...deletes.flatMap(({ label, act }) => (act ? [{ label, onSelect: act }] : [])),
        ]} />
      ) : null}>
      {s.detail === "Rereading" ? <div className="mt-3"><Spinner size="sm" /></div> : null}
      {uncertain ? <div role="status" className="mt-3 flex items-center gap-2 rounded-sm bg-secondary p-3 text-meta"><span aria-hidden className="size-2 rounded-full bg-warn" /><span className="flex-1">Unconfirmed</span></div> : null}
      {notices}
      {view.can({ type: "openInGoogle" }) ? <CalendarEventAction aria-label="Open in Google Calendar" onClick={() => void view.send({ type: "openInGoogle" })}><CalendarIcon aria-hidden />Open in Google Calendar</CalendarEventAction> : null}
      {view.can({ type: "openInAndroidCalendar" }) ? <CalendarEventAction aria-label="Open in Android Calendar" onClick={() => void view.send({ type: "openInAndroidCalendar" })}><CalendarIcon aria-hidden />Open in Android Calendar</CalendarEventAction> : null}
      {invited && (row.answerable || decline) ? (
        <CalendarAnswers initials={initials(organizer?.name ?? "")}>
          <CalendarAnswer chosen={row.answer === "AnsweredGoing" ? "going" : undefined} disabled={!editor.can(going)} onClick={() => void editor.send(going)}>Going</CalendarAnswer>
          <CalendarAnswer chosen={row.answer === "AnsweredMaybe" ? "going" : undefined} disabled={!editor.can(maybe)} onClick={() => void editor.send(maybe)}>Maybe</CalendarAnswer>
          <CalendarAnswer chosen={row.answer === "AnsweredDeclined" ? "declined" : undefined} disabled={!decline} onClick={decline}>No</CalendarAnswer>
        </CalendarAnswers>
      ) : null}
      <CalendarEventRows>
        {row.video ? (
          <CalendarEventRow icon={<Video />} text={row.video.replace(/^https:\/\//, "")}
            trailing={view.can({ type: "joinVideo" }) ? <CalendarJoin aria-label="Join video call" onClick={() => void view.send({ type: "joinVideo" })}>Join</CalendarJoin> : null} />
        ) : null}
        {row.place ? <CalendarEventRow icon={<MapPin />} text={row.place} openLabel={`Open ${row.place} in Maps`} onOpen={view.can({ type: "openPlace" }) ? () => void view.send({ type: "openPlace" }) : undefined} /> : null}
      </CalendarEventRows>
      {row.people.length > 0 ? (
        <div className="mt-3 flex flex-col">
          {row.people.map((person) => <CalendarPerson key={`${person.name}-${person.organizer}`} initials={initials(person.name)} name={person.name} status={words[replyWord(person.organizer, person.status)]} />)}
        </div>
      ) : null}
    </CalendarEventPage>
  );
}

// spec/app/calendar/deletions.md, "Undo inside the window sends nothing, and shows the event again"; spec/app/calendar/deletions.md, "The window ends only once its Undo notice is no longer shown"
function Undo({ runtime }: CalendarProps) {
  const held = useTimed(runtime, useHeld);
  const d = held.state;
  if (!d) return null;
  const titled = (id: number) => shown.lastSeen(id)?.title || "the event";
  const region = (toast: ReactNode) => <div role="status" aria-live="polite" className="pointer-events-none absolute inset-x-4 top-15 z-toast flex flex-col items-center">{toast}</div>;
  if (d.waiting === 0 || !d.notice) {
    if (d.dropped !== 0) return region(<Toast>{`${titled(d.dropped)} was not deleted: you signed in to another account.`}</Toast>);
    if (d.failed !== 0) return region(<Toast>{`Couldn't delete ${titled(d.failed)}. It may have changed; it's shown again.`}</Toast>);
    return null;
  }
  const undo: DeletionEvent | undefined = held.can({ type: "undo", now: untimed }) ? { type: "undo", now: untimed } : held.can({ type: "undoShown" }) ? { type: "undoShown" } : undefined;
  if (d.paused) {
    return region(
      <Toast onUndo={undo ? () => void held.send(undo) : undefined} undoLabel="Keep it">
        {`Alpha restarted before deleting ${titled(d.waiting)}.`}
        {held.can({ type: "sendPaused" }) ? <button type="button" className="ml-2 font-semibold underline" onClick={() => void held.send({ type: "sendPaused" })}>Delete</button> : null}
      </Toast>,
    );
  }
  return region(<Toast onUndo={undo ? () => void held.send(undo) : undefined}>{`${titled(d.waiting)} deleted`}</Toast>);
}

// spec/app/calendar/index.md, "Search and the Calendars sheet open over the days, never over an open event"
/** Search over the days: a field under the header, and the events read whose title, place or notes hold every word typed. */
function Searching({ runtime }: CalendarProps) {
  const view = useView(runtime);
  const [query, setQuery] = useState("");
  const s = view.state;
  if (!s) return null;
  const typed = query.toLocaleLowerCase().split(/\s+/).filter((word) => word !== "");
  const found = shown.visible(s.hidden, allows(s.access), s.connected)
    .filter((row) => typed.every((word) => `${row.title} ${row.place} ${row.notes}`.toLocaleLowerCase().includes(word)));
  const range = readWindow(s.anchor);
  const read = s.phone.status === "Loaded" || s.google.status === "Loaded";
  const open = (row: Row) => (view.can({ type: "pickDay", day: civilDay(row.begin) }) ? () => void view.send({ type: "pickDay", day: civilDay(row.begin) }) : undefined);
  return (
    <>
      <CalendarSearchBar aria-label="Search events" placeholder="Search events" autoFocus value={query} onChange={(event) => setQuery(event.target.value)}
        onClose={() => void view.send({ type: "closeOverlay" })} />
      <CalendarList aria-label="Search results" range={read ? `Searching ${monthDay.format(range.begin)} – ${monthDay.format(range.end - 1)}` : undefined}>
        <Days rows={found} today={s.today} from={range.begin} open={open} empty={typed.length > 0 ? "No matching events" : "No events"} />
      </CalendarList>
    </>
  );
}

// spec/app/calendar/editor.md, "Story: Keep my draft through a restart"
function Drafts({ runtime, day }: CalendarProps & { day: number }) {
  const editor = useEditor(runtime);
  const e = editor.state;
  if (!e || e.banner !== "Available") return null;
  const restore: Editor.Event = { type: "restore", revision: e.revision };
  return (
    <CalendarNotice actions={<>
      {editor.can(restore) ? <CalendarNoticeAction aria-label="Resume event draft" onClick={() => void editor.send(restore)}>Resume</CalendarNoticeAction> : null}
      {editor.can({ type: "askDiscard" }) ? <CalendarNoticeAction aria-label="Discard event draft" onClick={() => void editor.send({ type: "askDiscard" })}><X aria-hidden /></CalendarNoticeAction> : null}
      {editor.can({ type: "discard" }) ? <CalendarNoticeAction onClick={() => void editor.send({ type: "discard" })}>Discard it</CalendarNoticeAction> : null}
      {editor.can({ type: "callOff" }) ? <CalendarNoticeAction onClick={() => void editor.send({ type: "callOff" })}>Keep it</CalendarNoticeAction> : null}
    </>}>
      {`Unsaved event${e.form === "EditEvent" ? " change" : ""} from ${shortDate.format(dateOf(e.day || day))}`}
    </CalendarNotice>
  );
}

// spec/app/calendar/editor.md, "Story: Write an event"; spec/app/calendar/editor.md, "Story: Hand Android Calendar what Alpha cannot write"; spec/app/calendar/editor.md, "Story: Never create an event twice"
function Form({ runtime, day, today, connected }: CalendarProps & { day: number; today: number; connected: boolean }) {
  const editor = useEditor(runtime);
  const [fields, setFields] = useState<Fields>(() => runtime.runSync(kept(day, editor.state?.owner ?? 0)));
  const [picking, setPicking] = useState<string | undefined>(undefined);
  const e = editor.state;
  if (!e) return null;
  const blank = fields.title.trim() === "";
  const plain: Editor.Event = { type: "editTitle", blank };
  const change = (next: Fields, edit: Editor.Event) => {
    setFields(next);
    void runtime.runPromise(typed(next, edit));
  };
  const timing = (begin: number, end: number): Editor.Event => ({ type: "setTiming", start: begin, end });
  const retime = (begin: number, end: number) => {
    if (Number.isFinite(begin) && Number.isFinite(end) && end > begin && editor.can(timing(begin, end))) change({ ...fields, begin, end }, timing(begin, end));
  };
  const retimer = (begin: number, end: number) => (end > begin && editor.can(timing(begin, end)) ? () => retime(begin, end) : undefined);
  const length = fields.end - fields.begin;
  const startDay = civilDay(fields.begin);
  const endDay = civilDay(fields.end);
  const onTime = (base: number, value: string) => {
    const [h, m] = value.split(":").map(Number);
    return dayStart(base) + (h ?? 0) * hourMs + (m ?? 0) * 60_000;
  };
  const toDay = (value: string) => civilDay(new Date(`${value}T12:00`).getTime());
  const off = startDay - today;
  const firstChip = off === 0 ? 1 : off > 0 ? Math.max(1, off - 3) : off - 3;
  const chips = [0, ...Array.from({ length: 21 }, (_, at) => firstChip + at).filter((at) => at !== 0)].map((at) => {
    const target = today + at;
    const shift = (target - startDay) * 86_400_000;
    return {
      key: target, top: at === 0 ? "Today" : shortDay.format(dateOf(target)), date: dateOf(target).getDate(), label: dayName(target, today), chosen: target === startDay,
      onPick: retimer(fields.begin + shift, fields.end + shift),
    };
  });
  const people = fields.people.split(",").map((one) => one.trim()).filter((one) => one !== "");
  const setPeople = (list: ReadonlyArray<string>) => {
    const next = list.join(", ");
    const extras = next !== "" || (fields.repeat ?? "NoRepeat") !== "NoRepeat";
    change({ ...fields, people: next }, extras === e.extras ? plain : { type: "setExtras", extras });
  };
  const addTyped = () => {
    const email = (picking ?? "").trim();
    if (/^[^\s@]+@[^\s@]+$/.test(email) && !people.includes(email)) setPeople([...people, email]);
    setPicking("");
  };
  const scopes: ReadonlyArray<{ scope: Editor.Scope; label: string }> = [
    { scope: "ThisOne", label: "This event" }, { scope: "ThisAndFollowing", label: "This and following" }, { scope: "WholeSeries", label: "All events" },
  ];
  const off_ = !e.extras && !editor.can({ type: "save" }) ? saveOff[saveBlock(e.form === "NewEvent" && e.receipts.status === "Loading", e.draft.sync === "Saving", false, Editor.canKeepMyChanges(e), !e.titled)] : "";
  const choosesCalendar = e.form === "NewEvent" && connected && shown.present();
  const choosesRepeat = e.form === "NewEvent" && (!connected || fields.calendar === "Phone");
  const close = () => (editor.can({ type: "close" }) ? void editor.send({ type: "close" }) : undefined);
  return (
    <CalendarFormPage onBack={close} saving={e.draft.sync === "Saving"} onSave={!e.extras && editor.can({ type: "save" }) ? () => void editor.send({ type: "save" }) : undefined}>
      {e.form === "EditEvent" && e.repeats ? (
        <div role="group" aria-label="Save changes to" className="mx-6 my-1 flex flex-wrap items-center gap-2">
          <span className="text-meta text-muted-foreground">Save changes to</span>
          {scopes.map(({ scope, label }) => (
            <CalendarChip key={scope} chosen={e.scope === scope} disabled={!editor.can({ type: "chooseScope", scope }) && e.scope !== scope}
              className={e.scope === scope ? undefined : "bg-secondary"} onClick={() => void editor.send({ type: "chooseScope", scope })}>{label}</CalendarChip>
          ))}
        </div>
      ) : null}
      <p role="status" aria-label="Calendar form draft status" className="mx-6 my-1 text-meta text-muted-foreground">{off_}</p>
      {e.banner === "Failed" ? <CalendarNotice tone="caution" className="mx-6" actions={<CalendarNoticeAction onClick={() => void editor.send({ type: "retryKeeping" })}><RotateCcw aria-hidden />Retry</CalendarNoticeAction>}>Not saved on this phone</CalendarNotice> : null}
      {e.banner === "Conflict" ? (
        <CalendarNotice className="mx-6" actions={<>
          <CalendarNoticeAction onClick={() => void editor.send({ type: "keepMyDraft" })}>Keep mine</CalendarNoticeAction>
          {editor.can({ type: "askReplace" }) ? <CalendarNoticeAction onClick={() => void editor.send({ type: "askReplace" })}>Use the other</CalendarNoticeAction> : null}
          {editor.can({ type: "takeOtherDraft" }) ? <CalendarNoticeAction onClick={() => { setFields(runtime.runSync(kept(day, e.owner))); void editor.send({ type: "takeOtherDraft" }); }}>Replace mine</CalendarNoticeAction> : null}
          {editor.can({ type: "callOff" }) ? <CalendarNoticeAction onClick={() => void editor.send({ type: "callOff" })}>Cancel</CalendarNoticeAction> : null}
        </>}>Another copy of this draft replaced it.</CalendarNotice>
      ) : null}
      {Editor.canKeepMyChanges(e) ? (
        <CalendarNotice tone="caution" className="mx-6" actions={<>
          <CalendarNoticeAction onClick={() => void editor.send({ type: "keepMyChanges" })}>Keep my changes</CalendarNoticeAction>
          <CalendarNoticeAction onClick={() => void editor.send({ type: "takeSavedChanges" })}>Use the saved event</CalendarNoticeAction>
        </>}>This event changed since you started editing it.</CalendarNotice>
      ) : null}
      {e.form === "NewEvent" && e.receipts.status === "Failed" ? (
        <CalendarNotice tone="caution" className="mx-6" actions={editor.can({ type: "checkReceipts" }) ? <CalendarNoticeAction onClick={() => void editor.send({ type: "checkReceipts" })}><RotateCcw aria-hidden />Check</CalendarNoticeAction> : null}>
          Alpha couldn't check for events it may already have made, so it won't create this one yet.
        </CalendarNotice>
      ) : null}
      {e.unknownCreate && e.form === "NewEvent" ? (
        <CalendarNotice tone="caution" className="mx-6" actions={<>
          {editor.can({ type: "checkReceipts" }) ? <CalendarNoticeAction aria-label="Check if events were saved" onClick={() => void editor.send({ type: "checkReceipts" })}><RotateCcw aria-hidden />Check</CalendarNoticeAction> : null}
          {editor.can({ type: "createSeparately" }) ? <CalendarNoticeAction aria-label="Create a separate event" onClick={() => void editor.send({ type: "createSeparately" })}>Create new</CalendarNoticeAction> : null}
          {editor.can({ type: "letDoubtGo" }) ? <CalendarNoticeAction onClick={() => void editor.send({ type: "letDoubtGo" })}>Stop checking</CalendarNoticeAction> : null}
        </>}>Alpha can't tell whether your last new event was saved.</CalendarNotice>
      ) : null}
      <CalendarFormTitle value={fields.title} disabled={!editor.can({ type: "editTitle", blank: false })}
        onChange={(input) => change({ ...fields, title: input.target.value }, { type: "editTitle", blank: input.target.value.trim() === "" })} />
      <CalendarFormDate label="Date" aria-label="Calendar date" value={dateValue(fields.begin)} onChange={(input) => {
        const shift = (toDay(input.target.value) - startDay) * 86_400_000;
        retime(fields.begin + shift, fields.end + shift);
      }} />
      <CalendarDayChips days={chips} />
      <div className="flex flex-col gap-2.5 px-5 pt-3">
        {fields.allDay ? null : (
          <CalendarFormCard className="py-1 pr-2 pl-4">
            <CalendarTimeRow caption={hourMinute.format(fields.begin)} label="Start time" value={timeValue(fields.begin)}
              onChange={(value) => { const begin = onTime(startDay, value); retime(begin, begin + length); }}
              earlierLabel="Start earlier" laterLabel="Start later" onEarlier={retimer(fields.begin - quarter, fields.end - quarter)} onLater={retimer(fields.begin + quarter, fields.end + quarter)} />
            <CalendarTimeRow icon={null} caption={`${hourMinute.format(fields.end)} · ${duration(length)}`} label="End time" value={timeValue(fields.end)}
              onChange={(value) => retime(fields.begin, onTime(endDay, value))}
              earlierLabel="End earlier" laterLabel="End later" onEarlier={retimer(fields.begin, Math.max(fields.begin + 60_000, fields.end - quarter))} onLater={retimer(fields.begin, fields.end + quarter)} />
            <CalendarFormDate inset label="Ends on" aria-label="End date" value={dateValue(fields.end)} onChange={(input) => {
              const shift = (toDay(input.target.value) - endDay) * 86_400_000;
              retime(fields.begin, fields.end + shift);
            }} />
          </CalendarFormCard>
        )}
        <CalendarFieldRow icon={<MapPin />} aria-label="Location" placeholder="Location" value={fields.place} disabled={!editor.can(plain)}
          onChange={(input) => change({ ...fields, place: input.target.value }, plain)} />
        <CalendarFormCard className="h-14 flex-row items-center gap-3.5 pr-3 pl-4">
          <CalendarIcon aria-hidden className="size-5.5 shrink-0 text-muted-foreground" />
          <span className="grow text-body leading-plain">All day</span>
          <CalendarSwitch aria-label="All day" checked={fields.allDay} disabled={!editor.can({ type: "setAllDay", allDay: !fields.allDay })}
            onCheckedChange={(allDay) => change({ ...fields, allDay }, { type: "setAllDay", allDay })} />
        </CalendarFormCard>
        <CalendarFormCard className="gap-1 py-2.5 pr-3 pl-4">
          <div className="flex min-h-13 flex-wrap items-center gap-3.5">
            <UserRound aria-hidden className="size-5.5 shrink-0 text-muted-foreground" />
            {people.map((person) => (
              <button key={person} type="button" aria-label={`Remove ${person}`} onClick={() => setPeople(people.filter((one) => one !== person))}
                className="flex min-h-9 max-w-full min-w-0 items-center gap-1.5 rounded-full bg-background py-0 pr-2.5 pl-1 text-sm font-semibold wrap-anywhere">
                <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-accent text-2xs font-bold whitespace-nowrap">{initials(person)}</span>
                {person.replace(/@.*/, "")}
                <X aria-hidden className="size-3.5 text-muted-foreground" />
              </button>
            ))}
            {picking === undefined ? (
              <button type="button" aria-label="Add people" onClick={() => setPicking("")} className="flex h-13 items-center gap-0.5 rounded-action bg-background px-2.5">
                <Plus aria-hidden className="size-4" /><UserRound aria-hidden className="size-4" />
              </button>
            ) : null}
          </div>
          {picking === undefined ? null : (
            <CalendarPickerField aria-label="Name or email" placeholder="Name or email" autoFocus value={picking} onChange={(input) => setPicking(input.target.value)}
              onKeyDown={(key) => { if (key.key === "Enter") { key.preventDefault(); addTyped(); } if (key.key === "Escape") setPicking(undefined); }}
              doneLabel="Done adding people" onDone={() => { addTyped(); setPicking(undefined); }} />
          )}
        </CalendarFormCard>
        {choosesCalendar || choosesRepeat ? (
          <CalendarFormCard className="gap-1 py-2 pr-3 pl-4">
            {choosesCalendar ? (
              <CalendarFormRow icon={<CalendarIcon />}>
                <div className="flex min-w-0 flex-[1_1_0] flex-wrap gap-2">
                  {(["Agent", "Phone"] as const).map((target) => (
                    <CalendarChip key={target} chosen={(fields.calendar ?? "Agent") === target} dot={target === "Agent" ? "primary" : "foreground"}
                      onClick={() => change({ ...fields, calendar: target }, plain)}>{target === "Agent" ? "Your agent's calendar" : "This phone's calendar"}</CalendarChip>
                  ))}
                </div>
              </CalendarFormRow>
            ) : null}
            {choosesRepeat ? (
              <CalendarFormRow icon={<Repeat />}>
                <div className="flex min-w-0 flex-[1_1_0] flex-wrap gap-1.5">
                  {repeats.map(({ repeat, label }) => (
                    <CalendarChip key={repeat} chosen={(fields.repeat ?? "NoRepeat") === repeat} onClick={() => {
                      const extras = repeat !== "NoRepeat" || fields.people.trim() !== "";
                      change({ ...fields, repeat }, extras === e.extras ? plain : { type: "setExtras", extras });
                    }}>{label}</CalendarChip>
                  ))}
                </div>
              </CalendarFormRow>
            ) : null}
          </CalendarFormCard>
        ) : null}
        {e.extras ? (
          <button type="button" aria-label="Open in Android Calendar" disabled={!editor.can({ type: "handOff" })} onClick={() => void editor.send({ type: "handOff" })}
            className="flex min-h-13 items-center gap-2 rounded-lg bg-secondary px-4 py-3 text-left disabled:opacity-50">
            <CalendarIcon aria-hidden className="size-4.5" />Calendar<ChevronRight aria-hidden className="size-4 text-muted-foreground" />
          </button>
        ) : null}
        <CalendarNotesField icon={<TextAlignStart />} aria-label="Notes" placeholder="Notes" value={fields.notes} disabled={!editor.can(plain)}
          onChange={(input) => change({ ...fields, notes: input.target.value }, plain)} />
      </div>
    </CalendarFormPage>
  );
}

// spec/app/calendar/agent.md, "Only the owner approves, and approving sends the change once, under a new number"; spec/app/calendar/agent.md, "A card that leaves out a field its change would set can be declined, never approved"
function Proposal({ runtime }: CalendarProps) {
  const agent = useChanges(runtime);
  const a = agent.state;
  if (!a) return null;
  if (a.stage === "Idle") return a.result in results ? <CalendarNotice>{results[a.result]}</CalendarNotice> : null;
  const row = shown.find(a.id);
  const request = requests.find(a.filing);
  const f = request?.fields;
  const start = f ? Date.parse(f.startAt) : NaN;
  const end = f ? Date.parse(f.endAt) : NaN;
  return (
    <section aria-label="Calendar change" className="mx-4 mb-2 shrink-0 rounded-chip bg-secondary px-5 py-4.5 text-base leading-normal">
      <strong>{`${changes[a.change]}${a.reply === "NoReply" ? "" : `: ${replies[a.reply]}`}${a.updated ? " (updated)" : ""}`}</strong>
      <p className="text-meta text-muted-foreground">{statuses[requestStatus(request !== undefined, a.complete, "RequestPending")]}</p>
      {row ? <p>{`${a.change === "Update" ? "Now: " : ""}${row.title || "Untitled event"} · ${shortDate.format(row.begin)} · ${interval(row)}`}</p> : null}
      {f ? (
        <dl>
          <dt className="sr-only">Title</dt><dd>{f.title || "Untitled event"}</dd>
          <dt className="sr-only">When</dt><dd>{Number.isFinite(start) && Number.isFinite(end)
            ? `${shortDate.format(start)} · ${f.isAllDay ? "All day" : hourMinute.formatRange(start, end)}${f.timeZone ? ` (${f.timeZone})` : ""}` : "No valid time"}</dd>
          {f.location ? <><dt className="sr-only">Place</dt><dd>{f.location}</dd></> : null}
          {f.attendees.length > 0 ? <><dt className="sr-only">People</dt><dd>{f.attendees.join(", ")}</dd></> : null}
        </dl>
      ) : null}
      {request ? <p className="text-meta text-muted-foreground">{request.calendarId === "" || request.calendarId === "primary" ? "Your agent's calendar" : `Calendar ${request.calendarId}`}</p> : null}
      {request && occurrences[request.occurrences] ? <p className="text-meta">{occurrences[request.occurrences]}</p> : null}
      {request && a.change !== "Create" ? <p className="text-meta text-muted-foreground">{request.notify ? "Guests are told of this change." : "No invitations are sent."}</p> : null}
      {a.complete ? null : <p className="text-meta text-muted-foreground">Alpha can't check this whole change, so it can't be approved.</p>}
      {a.stage === "Sending" || a.stage === "ReadingBack" ? <Spinner size="sm" /> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {agent.can({ type: "decline" }, "Owner") ? <button type="button" className="min-h-11 rounded-full bg-background px-4.5" onClick={() => void agent.send({ type: "decline" }, "Owner")}>Decline</button> : null}
        {agent.can({ type: "approve" }, "Owner") ? <button type="button" className="min-h-11 rounded-full bg-alpha px-4.5 text-alpha-foreground" onClick={() => void agent.send({ type: "approve" }, "Owner")}>Approve</button> : null}
      </div>
    </section>
  );
}

const said: Readonly<Record<Link.Said, string>> = {
  Quiet: "", ReadOnlyAccess: "Google lets your agent read this calendar but not change it. Allow changes to link it.",
  NotConnected: "Google isn't connected.", Stopped: "Setup stopped. Nothing was linked.", NotReady: "Calendar isn't ready yet. Try again.",
  ControlChanged: "Sync was changed somewhere else. Check it and try again.", DestinationMissing: "The linked calendar is no longer in your Google account.",
  DestinationUnapproved: "The linked calendar isn't one your agent may write to.", WaitingForDispatch: "Your agent is still sending an earlier change.",
  StillSyncing: "Syncing.", ChoosePrimary: "Choose a calendar in Google Calendar first.", ConflictHeld: "One event conflicts and is held.",
  ConflictMany: "Several events conflict.", UnconfirmedReview: "Alpha couldn't confirm sync.", UnconfirmedWrite: "Alpha couldn't confirm the change to sync.",
  UnconfirmedLinks: "Alpha couldn't read the linked events back.", UnsentReview: "Alpha couldn't read sync. Nothing changed.", Linked: "Synced.",
};

const rowWords: Readonly<Record<Link.GoogleRow, string>> = {
  RowConnected: "Connected", RowFinishSetup: "Finish setup", RowNotConnected: "Not connected", RowCouldNotCheck: "Couldn't check",
};

const endings: Readonly<Record<Link.Outcome, string>> = {
  NoOutcome: "Google Calendar", Synced: "Synced", Syncing: "Syncing", NeedsGrant: "Finish setup", NotLinked: "Not linked", Unconfirmed: "Couldn't check",
};

// spec/app/calendar/link.md, "Story: See whether my agent's Calendar reaches Google"; spec/app/calendar/link.md, "Story: Link a Google calendar I can write to, and be told it is synced only when it is"; spec/app/calendar/link.md, "Story: Disconnect Google from Calendar without leaving sync running"
function GoogleRow({ runtime }: CalendarProps) {
  const link = useLink(runtime);
  const view = useView(runtime);
  const l = link.state;
  if (!l || !view.state || l.owner === 0) return null;
  const running = l.phase !== "Idle" && l.phase !== "Done";
  const pill = "min-h-11 rounded-full px-4 text-sm font-semibold";
  return (
    <ListGroup heading="Google Calendar">
      <ListRow title={running ? "Checking…" : rowWords[Link.rowOf(l)]} detail={said[l.said] || (l.ending === "NoOutcome" ? undefined : endings[l.ending])} />
      <div className="flex flex-wrap gap-2 p-2">
        {link.can({ type: "start" }) ? <button type="button" className={`${pill} ${l.ending === "Synced" ? "bg-secondary" : "bg-alpha text-alpha-foreground"}`} onClick={() => void runtime.runPromise(setUp())}>{l.ending === "NoOutcome" ? "Link Google Calendar" : "Check again"}</button> : null}
        {link.can({ type: "cancel" }) ? <button type="button" className={`${pill} bg-secondary`} onClick={() => void link.send({ type: "cancel" })}>Cancel</button> : null}
        {link.can({ type: "pauseAsked" }) && l.ending === "Synced" ? <button type="button" className={`${pill} bg-secondary`} onClick={() => void link.send({ type: "pauseAsked" })}>Pause sync</button> : null}
      </div>
      {l.pause === "PauseConfirmed" ? <p className="px-4 text-sm">Sync is paused.</p> : l.pause === "PauseUnknown" ? <p className="px-4 text-sm">Alpha couldn't confirm sync paused.</p> : null}
    </ListGroup>
  );
}
